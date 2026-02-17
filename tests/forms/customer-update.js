import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Customer Profile Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 🏠 Заказчик
 * API: PATCH /api/customer/{id}
 * Проверяет: редактирование заказчика
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   CUSTOMER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/customer-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const CUSTOMER_ID = __ENV.CUSTOMER_ID || '1';
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
  const url = `${BASE_URL}/api/customer/${CUSTOMER_ID}`;
  
  const payload = JSON.stringify({
    customer_type: 'Коммерческая организация',
    city: 'Санкт-Петербург',
    about: 'Обновленное описание организации-заказчика'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование профиля заказчика ID=${CUSTOMER_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'CustomerUpdate' }
  });

  check(response, {
    'Customer Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Customer Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Customer Update: status=${response.status}`);
  
  sleep(0.5);
}
