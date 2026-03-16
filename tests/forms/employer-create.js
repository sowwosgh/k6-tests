import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';
import { generateINN, generateCompanyName, generatePhone, generateEmail, pause } from '../../utils/generators.js';

/**
 * 🧪 TEST: Employer Profile Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать профиль 🏢 Работодатель
 * API: POST /api/employer
 * Проверяет: открытие формы, создание работодателя
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/employer-create.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
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
  const url = `${BASE_URL}/api/employer`;
  
  pause(10); // Prevent timestamp collisions
  const inn = generateINN();
  const companyName = generateCompanyName('Работодатель K6');
  
  const payload = JSON.stringify({
    company_name: companyName,
    inn: inn,
    industry: 'Строительство и недвижимость',
    company_size: '50-100',
    city: 'Москва',
    region: 'Московская область',
    address: 'г. Москва, ул. Тестовая, д. 1',
    website: 'https://k6test-employer.com',
    contact_person: 'Тестовый HR',
    contact_phone: '+7 (666) 777-88-99',
    contact_email: 'hr@k6test-employer.com',
    about: 'Тестовая компания-работодатель для k6 тестирования'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание профиля работодателя... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'EmployerCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Employer Create: создание успешно (status 200)': (r) => r.status === 200,
      'Employer Create: получен ID созданного профиля': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Employer Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Employer Create');
    
    console.log(`✅ Employer Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Employer Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Employer Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
