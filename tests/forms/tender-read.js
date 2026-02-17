import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Tender View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр тендера
 * API: GET /api/tender/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   TENDER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/tender-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const TENDER_ID = __ENV.TENDER_ID || '1';
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
  const url = `${BASE_URL}/api/tenders/${TENDER_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр тендера ID=${TENDER_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'TenderRead' }
  });

  checkViewOperation(response, 'Tender Read', 'tender');
  
  const requiredFields = [
    'id',
    'title',
    'tender_type',
    'city',
    'object_address',
    'description',
    'requirements',
    'submission_deadline'
  ];
  checkRequiredFields(response, 'Tender Read', requiredFields);
  
  const uiFields = [
    'title',
    'tender_number',
    'tender_type',
    'city',
    'object_address',
    'description',
    'budget_min',
    'budget_max',
    'submission_deadline',
    'phone'
  ];
  checkUIStructure(response, 'Tender Read', uiFields);

  console.log(`✅ Tender Read: status=${response.status}`);
  
  sleep(0.3);
}
