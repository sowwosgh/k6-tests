import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Contractor Profile View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр профиля подрядчика
 * API: GET /api/contractor/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   CONTRACTOR_ID=1 SESSION_COOKIE="..." k6 run tests/forms/contractor-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const CONTRACTOR_ID = __ENV.CONTRACTOR_ID || '1';
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
  const url = `${BASE_URL}/api/contractor/${CONTRACTOR_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр профиля подрядчика ID=${CONTRACTOR_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'ContractorRead' }
  });

  checkViewOperation(response, 'Contractor Read', 'contractor');
  
  const requiredFields = [
    'id',
    'company_name',
    'legal_form',
    'inn',
    'services',
    'work_city',
    'status'
  ];
  checkRequiredFields(response, 'Contractor Read', requiredFields);
  
  const uiFields = [
    'company_name',
    'legal_form',
    'inn',
    'services',
    'work_city',
    'contact_person',
    'contact_phone',
    'contact_email',
    'status'
  ];
  checkUIStructure(response, 'Contractor Read', uiFields);

  console.log(`✅ Contractor Read: status=${response.status}`);
  
  sleep(0.3);
}
