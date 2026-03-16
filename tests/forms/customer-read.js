import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Customer Profile View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр профиля заказчика
 * API: GET /api/customer/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   CUSTOMER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/customer-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const CUSTOMER_ID = __ENV.CUSTOMER_ID || '1';
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
  const url = `${BASE_URL}/api/customer/${CUSTOMER_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр профиля заказчика ID=${CUSTOMER_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'CustomerRead' }
  });

  checkViewOperation(response, 'Customer Read', 'customer');
  
  const requiredFields = [
    'id',
    'company_name',
    'inn',
    'city'
  ];
  checkRequiredFields(response, 'Customer Read', requiredFields);
  
  const uiFields = [
    'company_name',
    'inn',
    'customer_type',
    'city',
    'region',
    'contact_person',
    'contact_phone',
    'contact_email',
    'about'
  ];
  checkUIStructure(response, 'Customer Read', uiFields);

  console.log(`✅ Customer Read: status=${response.status}`);
  
  sleep(0.3);
}
