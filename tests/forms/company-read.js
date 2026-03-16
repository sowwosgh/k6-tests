import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Company Profile View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр профиля компании
 * API: GET /api/company/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   COMPANY_ID=1 SESSION_COOKIE="..." k6 run tests/forms/company-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const COMPANY_ID = __ENV.COMPANY_ID || '1';
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
  const url = `${BASE_URL}/api/company/${COMPANY_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр профиля компании ID=${COMPANY_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'CompanyRead' }
  });

  checkViewOperation(response, 'Company Read', 'company');
  
  const requiredFields = [
    'id',
    'name',
    'inn'
  ];
  checkRequiredFields(response, 'Company Read', requiredFields);
  
  const uiFields = [
    'name',
    'inn',
    'website'
  ];
  checkUIStructure(response, 'Company Read', uiFields);

  console.log(`✅ Company Read: status=${response.status}`);
  
  sleep(0.3);
}
