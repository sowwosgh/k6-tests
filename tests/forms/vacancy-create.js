import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Vacancy Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать 💼 Вакансию
 * API: POST /api/vacancy
 * Проверяет: открытие формы, создание вакансии
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/vacancy-create.js
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
  const url = `${BASE_URL}/api/vacancy`;
  
  const payload = JSON.stringify({
    title: 'Тестовая вакансия K6 - Инженер-строитель',
    company_name: 'ООО Тестстрой',
    city: 'Москва',
    specialization: 'Строительство',
    description: 'Тестовая вакансия для k6 тестирования',
    salary_min: 80000,
    salary_max: 120000,
    industry: 'Строительство',
    employment_type: 'full',
    experience: '3-5 лет',
    phone: '+7 (555) 444-33-22',
    email: 'hr@teststroi.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание вакансии... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'VacancyCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Vacancy Create: создание успешно (status 200)': (r) => r.status === 200,
      'Vacancy Create: получен ID созданной вакансии': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      }
    });
    
    checkNoDuplicateFields(response, 'Vacancy Create');
    
    console.log(`✅ Vacancy Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Vacancy Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Vacancy Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
