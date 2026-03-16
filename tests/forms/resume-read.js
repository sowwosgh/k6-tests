import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Resume View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр резюме
 * API: GET /api/resume/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   RESUME_ID=1 SESSION_COOKIE="..." k6 run tests/forms/resume-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const RESUME_ID = __ENV.RESUME_ID || '1';
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
  const url = `${BASE_URL}/api/resume/${RESUME_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр резюме ID=${RESUME_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'ResumeRead' }
  });

  checkViewOperation(response, 'Resume Read', 'resume');
  
  const requiredFields = [
    'id',
    'full_name',
    'desired_position',
    'city',
    'phone'
  ];
  checkRequiredFields(response, 'Resume Read', requiredFields);
  
  const uiFields = [
    'full_name',
    'age',
    'desired_position',
    'salary',
    'city',
    'experience_years',
    'phone'
  ];
  checkUIStructure(response, 'Resume Read', uiFields);

  console.log(`✅ Resume Read: status=${response.status}`);
  
  sleep(0.3);
}
