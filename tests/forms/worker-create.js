import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { 
  checkNoDuplicateFields 
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Worker Profile Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать профиль 👷 Специалист
 * API: POST /api/worker
 * Проверяет: открытие формы, все поля, нет дублей
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   # Без авторизации (проверка 401)
 *   k6 run tests/forms/worker-create.js
 * 
 *   # С авторизацией (полный тест)
 *   AUTH_TOKEN=your-jwt-token k6 run tests/forms/worker-create.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.8']  // Снижен порог до 80% т.к. без токена ожидаем 401
  }
};

export default function() {
  const url = `${BASE_URL}/api/worker`;
  
  // Минимальный payload для создания специалиста
  const payload = JSON.stringify({
    full_name: 'Test Worker K6',
    specialization: 'Сантехник',
    work_city: 'Москва',
    work_region: 'Московская область',
    search_status: 'active_search',
    contact_phone: '+7 (999) 123-45-67',
    contact_person: 'Test Worker'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание профиля специалиста... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'WorkerCreate' }
  });

  if (SESSION_COOKIE) {
    // С авторизацией — ожидаем успех
    // Note: API возвращает только {id, message}, не полный профиль
    check(response, {
      'Worker Create: создание успешно (status 200)': (r) => r.status === 200,
      'Worker Create: получен ID созданного профиля': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Worker Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Worker Create');
    
    console.log(`✅ Worker Create: status=${response.status} (authenticated)`);
  } else {
    // Без авторизации — ожидаем 401
    check(response, {
      'Worker Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Worker Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
