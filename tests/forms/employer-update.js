import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Employer Profile Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 🏢 Работодатель
 * API: PATCH /api/employer/{id}
 * Проверяет: редактирование работодателя
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   EMPLOYER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/employer-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYER_ID = __ENV.EMPLOYER_ID || '1';
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
  const url = `${BASE_URL}/api/employer/${EMPLOYER_ID}`;
  
  const payload = JSON.stringify({
    company_size: '100-200',
    website: 'https://updated-k6test.com',
    about: 'Обновленное описание компании-работодателя'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование профиля работодателя ID=${EMPLOYER_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'EmployerUpdate' }
  });

  check(response, {
    'Employer Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Employer Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Employer Update: status=${response.status}`);
  
  sleep(0.5);
}
