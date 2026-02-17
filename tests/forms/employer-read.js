import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Employer Profile View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр профиля работодателя
 * API: GET /api/employer/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   EMPLOYER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/employer-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const EMPLOYER_ID = __ENV.EMPLOYER_ID || '1';
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
  const url = `${BASE_URL}/api/employer/${EMPLOYER_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр профиля работодателя ID=${EMPLOYER_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'EmployerRead' }
  });

  checkViewOperation(response, 'Employer Read', 'employer');
  
  const requiredFields = [
    'id',
    'company_name',
    'inn',
    'industry',
    'company_size',
    'address',
    'about'
  ];
  checkRequiredFields(response, 'Employer Read', requiredFields);
  
  const uiFields = [
    'company_name',
    'inn',
    'industry',
    'company_size',
    'city',
    'address',
    'contact_person',
    'contact_phone',
    'about'
  ];
  checkUIStructure(response, 'Employer Read', uiFields);

  console.log(`✅ Employer Read: status=${response.status}`);
  
  sleep(0.3);
}
