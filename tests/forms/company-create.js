import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';
import { generateINN, generateCompanyName, pause } from '../../utils/generators.js';

/**
 * 🧪 TEST: Company Profile Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать профиль 🏭 Компания
 * API: POST /api/company
 * Проверяет: открытие формы, создание компании
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/company-create.js
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
  const url = `${BASE_URL}/api/company`;
  
  pause(10); // Prevent timestamp collisions
  const inn = generateINN();
  const companyName = generateCompanyName('Компания K6');
  
  const payload = JSON.stringify({
    name: companyName,
    inn: inn,
    website: 'https://k6test-company.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание профиля компании... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'CompanyCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Company Create: создание успешно (status 200)': (r) => r.status === 200,
      'Company Create: получен ID созданного профиля': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Company Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Company Create');
    
    console.log(`✅ Company Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Company Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Company Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
