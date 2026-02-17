import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';
import { generateINN, generateCompanyName, generatePhone, generateEmail, pause } from '../../utils/generators.js';

/**
 * 🧪 TEST: Contractor Profile Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать профиль 🏗️ Подрядчик
 * API: POST /api/contractor
 * Проверяет: открытие формы, создание подрядчика
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/contractor-create.js
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
  const url = `${BASE_URL}/api/contractor`;
  
  pause(10); // Prevent timestamp collisions
  const inn = generateINN();
  const companyName = generateCompanyName('Подрядчик K6');
  
  const payload = JSON.stringify({
    company_name: companyName,
    legal_form: 'ООО',
    inn: inn,
    services: 'Строительство, Отделка, Монтаж',
    work_city: 'Москва',
    work_region: 'Московская область',
    status: 'available',
    contact_person: 'Тестовый Контактный',
    contact_phone: '+7 (888) 999-77-66',
    contact_email: 'contractor@k6test.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание профиля подрядчика... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'ContractorCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Contractor Create: создание успешно (status 200)': (r) => r.status === 200,
      'Contractor Create: получен ID созданного профиля': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Contractor Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Contractor Create');
    
    console.log(`✅ Contractor Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Contractor Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Contractor Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
