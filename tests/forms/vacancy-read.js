import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Vacancy View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр вакансии
 * API: GET /api/vacancy/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   VACANCY_ID=1 SESSION_COOKIE="..." k6 run tests/forms/vacancy-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const VACANCY_ID = __ENV.VACANCY_ID || '1';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.8']
  }
};

export default function() {
  const url = `${BASE_URL}/api/vacancy/${VACANCY_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр вакансии ID=${VACANCY_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'VacancyRead' }
  });

  checkViewOperation(response, 'Vacancy Read', 'vacancy');
  
  const requiredFields = [
    'id',
    'title',
    'company_name',
    'city',
    'phone'
  ];
  checkRequiredFields(response, 'Vacancy Read', requiredFields);
  
  const uiFields = [
    'title',
    'company_name',
    'city',
    'specialization',
    'salary_min',
    'salary_max',
    'phone'
  ];
  checkUIStructure(response, 'Vacancy Read', uiFields);

  console.log(`✅ Vacancy Read: status=${response.status}`);
  
  sleep(0.3);
}
