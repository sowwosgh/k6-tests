import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Resume Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать 📄 Резюме
 * API: POST /api/resume
 * Проверяет: открытие формы, создание резюме
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/resume-create.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
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
  const url = `${BASE_URL}/api/resume`;
  
  const payload = JSON.stringify({
    full_name: 'Тестовый Кандидат K6',
    age: 30,
    desired_position: 'Инженер-строитель',
    salary: 100000,
    salary_negotiable: true,
    employment_type: 'full',
    city: 'Москва',
    education_level: 'Высшее',
    experience_years: 5,
    phone: '+7 (444) 555-66-77',
    email: 'candidate@k6test.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание резюме... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'ResumeCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Resume Create: создание успешно (status 200)': (r) => r.status === 200,
      'Resume Create: получен ID созданного резюме': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      }
    });
    
    checkNoDuplicateFields(response, 'Resume Create');
    
    console.log(`✅ Resume Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Resume Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Resume Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
