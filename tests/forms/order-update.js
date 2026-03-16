import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Order Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 📋 Заказ
 * API: PATCH /api/order/{id}
 * Проверяет: редактирование заказа
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   ORDER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/order-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const ORDER_ID = __ENV.ORDER_ID || '1';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.8']
  }
};

export default function() {
  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;
  
  const payload = JSON.stringify({
    budget: 600000,
    urgency: 'high',
    status: 'in_progress'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование заказа ID=${ORDER_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'OrderUpdate' }
  });

  check(response, {
    'Order Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Order Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Order Update: status=${response.status}`);
  
  sleep(0.5);
}
