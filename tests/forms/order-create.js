import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Order Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать 📋 Заказ
 * API: POST /api/order
 * Проверяет: открытие формы, создание заказа
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/order-create.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.8']
  }
};

export default function() {
  const url = `${BASE_URL}/api/orders`;
  
  const payload = JSON.stringify({
    title: 'Тестовый заказ K6 - Строительство гаража',
    work_type: 'Строительство',
    industry: 'Строительство и недвижимость',
    city: 'Москва',
    region: 'Московская область',
    description: 'Тестовый заказ для k6 тестирования. Требуется построить гараж.',
    budget: 500000,
    payment_type: 'По договоренности',
    deadline: '2026-06-01',
    urgency: 'normal',
    phone: '+7 (333) 222-11-00'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание заказа... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'OrderCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Order Create: создание успешно (status 200)': (r) => r.status === 200,
      'Order Create: получен ID созданного заказа': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Order Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Order Create');
    
    console.log(`✅ Order Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Order Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Order Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
