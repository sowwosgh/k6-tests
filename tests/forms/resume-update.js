import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Resume Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 📄 Резюме
 * API: PATCH /api/resume/{id}
 * Проверяет: редактирование резюме
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   RESUME_ID=1 SESSION_COOKIE="..." k6 run tests/forms/resume-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const RESUME_ID = __ENV.RESUME_ID || '1';
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
  const url = `${BASE_URL}/api/resume/${RESUME_ID}`;
  
  const payload = JSON.stringify({
    salary: 120000,
    experience_years: 6,
    employment_type: 'remote'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование резюме ID=${RESUME_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'ResumeUpdate' }
  });

  check(response, {
    'Resume Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Resume Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Resume Update: status=${response.status}`);
  
  sleep(0.5);
}
