import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Contractor Profile Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 🏗️ Подрядчик
 * API: PATCH /api/contractor/{id}
 * Проверяет: редактирование подрядчика
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   CONTRACTOR_ID=1 SESSION_COOKIE="..." k6 run tests/forms/contractor-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const CONTRACTOR_ID = __ENV.CONTRACTOR_ID || '1';
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
  const url = `${BASE_URL}/api/contractor/${CONTRACTOR_ID}`;
  
  const payload = JSON.stringify({
    status: 'on_site',
    services: 'Строительство, Отделка, Монтаж, Кровельные работы',
    contact_email: 'updated@k6test.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование профиля подрядчика ID=${CONTRACTOR_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'ContractorUpdate' }
  });

  check(response, {
    'Contractor Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Contractor Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Contractor Update: status=${response.status}`);
  
  sleep(0.5);
}
