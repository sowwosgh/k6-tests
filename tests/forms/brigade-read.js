import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Brigade Profile View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр профиля бригады
 * API: GET /api/brigade/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   BRIGADE_ID=1 SESSION_COOKIE="..." k6 run tests/forms/brigade-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const BRIGADE_ID = __ENV.BRIGADE_ID || '1';
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
  const url = `${BASE_URL}/api/brigade/${BRIGADE_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр профиля бригады ID=${BRIGADE_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'BrigadeRead' }
  });

  checkViewOperation(response, 'Brigade Read', 'brigade');
  
  const requiredFields = [
    'id',
    'name',
    'leader_name',
    'team_size',
    'specs',
    'work_city',
    'status'
  ];
  checkRequiredFields(response, 'Brigade Read', requiredFields);
  
  const uiFields = [
    'name',
    'leader_name',
    'team_size',
    'specs',
    'work_city',
    'contact_phone',
    'status'
  ];
  checkUIStructure(response, 'Brigade Read', uiFields);

  console.log(`✅ Brigade Read: status=${response.status}`);
  
  sleep(0.3);
}
