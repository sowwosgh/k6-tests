import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Tender Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 📢 Тендер
 * API: PATCH /api/tender/{id}
 * Проверяет: редактирование тендера
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   TENDER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/tender-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TENDER_ID = __ENV.TENDER_ID || '1';
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
  const url = `${BASE_URL}/api/tenders/${TENDER_ID}`;
  
  const payload = JSON.stringify({
    budget_max: 90000000,
    submission_deadline: '2026-04-15',
    requirements: 'СРО, лицензии, опыт работы от 5 лет, рекомендации'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование тендера ID=${TENDER_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'TenderUpdate' }
  });

  check(response, {
    'Tender Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Tender Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Tender Update: status=${response.status}`);
  
  sleep(0.5);
}
