import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Brigade Profile Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать профиль 👥 Бригада
 * API: POST /api/brigade
 * Проверяет: открытие формы, создание бригады
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/brigade-create.js
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
  const url = `${BASE_URL}/api/brigade`;
  
  const payload = JSON.stringify({
    name: 'Test Brigade K6',
    leader_name: 'Тестовый Бригадир',
    team_size: 5,
    specs: 'Кирпичная кладка, Бетонные работы',
    work_city: 'Москва',
    work_region: 'Московская область',
    status: 'available',
    contact_person: 'Тестовый Бригадир',
    contact_phone: '+7 (999) 888-77-66'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание профиля бригады... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'BrigadeCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Brigade Create: создание успешно (status 200)': (r) => r.status === 200,
      'Brigade Create: получен ID созданной бригады': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Brigade Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Brigade Create');
    
    console.log(`✅ Brigade Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Brigade Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Brigade Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
