import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';

/**
 * 🧪 TEST: Brigade Profile Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 👥 Бригада
 * API: PATCH /api/brigade/{id}
 * Проверяет: редактирование бригады
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   BRIGADE_ID=1 SESSION_COOKIE="..." k6 run tests/forms/brigade-update.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const BRIGADE_ID = __ENV.BRIGADE_ID || '1';
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
  const url = `${BASE_URL}/api/brigade/${BRIGADE_ID}`;
  
  const payload = JSON.stringify({
    status: 'on_site',
    team_size: 7,
    transport: 'Газель'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`✏️ Редактирование профиля бригады ID=${BRIGADE_ID}...`);
  const response = http.patch(url, payload, {
    headers: headers,
    tags: { name: 'BrigadeUpdate' }
  });

  check(response, {
    'Brigade Update: редактирование успешно (status 200)': (r) => r.status === 200,
    'Brigade Update: возвращены данные': () => {
      const data = parseJsonSafe(response);
      return data !== null && typeof data === 'object';
    }
  });

  console.log(`✅ Brigade Update: status=${response.status}`);
  
  sleep(0.5);
}
