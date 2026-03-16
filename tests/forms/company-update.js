import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Company Profile Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 🏭 Компания
 * API: PATCH /api/company/{id}
 * Проверяет: редактирование компании
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   COMPANY_ID=1 SESSION_COOKIE="..." k6 run tests/forms/company-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const COMPANY_ID = __ENV.COMPANY_ID || '1';
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
  const url = `${BASE_URL}/api/company/${COMPANY_ID}`;
  
  const payload = JSON.stringify({
    website: 'https://updated-k6test-company.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование профиля компании ID=${COMPANY_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'CompanyUpdate' }
  });

  check(response, {
    'Company Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Company Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Company Update: status=${response.status}`);
  
  sleep(0.5);
}
