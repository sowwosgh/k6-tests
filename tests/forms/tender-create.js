import http from 'k6/http';
import { sleep, check } from 'k6';
import { parseJsonSafe } from '../../utils/checks.js';
import { checkNoDuplicateFields } from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Tender Creation (QuickCreateFormRule)
 * 
 * Сценарий: Правое окно "Быстрое создание" → Создать 📢 Тендер
 * API: POST /api/tender
 * Проверяет: открытие формы, создание тендера
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/tender-create.js
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
  const url = `${BASE_URL}/api/tenders`;
  
  const payload = JSON.stringify({
    title: 'Тестовый тендер K6 - Строительство жилого комплекса',
    tender_number: 'K6-TEST-2026-001',
    tender_type: 'Открытый конкурс',
    city: 'Москва',
    region: 'Московская область',
    object_address: 'г. Москва, район Тестовый',
    description: 'Тестовый тендер для k6 тестирования. Строительство жилого комплекса.',
    requirements: 'СРО, лицензии, опыт работы от 5 лет',
    budget_min: 50000000,
    budget_max: 80000000,
    submission_deadline: '2026-04-01',
    work_start: '2026-05-01',
    work_end: '2027-12-31',
    organization: 'ООО Тестовый застройщик',
    phone: '+7 (222) 333-44-55',
    email: 'tender@k6test.com'
  });

  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  console.log(`📝 Создание тендера... (auth: ${SESSION_COOKIE ? 'YES' : 'NO'})`);
  const response = http.post(url, payload, {
    headers: headers,
    tags: { name: 'TenderCreate' }
  });

  if (SESSION_COOKIE) {
    check(response, {
      'Tender Create: создание успешно (status 200)': (r) => r.status === 200,
      'Tender Create: получен ID созданного тендера': () => {
        const data = parseJsonSafe(response);
        return data && data.id !== undefined;
      },
      'Tender Create: есть подтверждающее сообщение': () => {
        const data = parseJsonSafe(response);
        return data && data.message && data.message.includes('создан');
      }
    });
    
    checkNoDuplicateFields(response, 'Tender Create');
    
    console.log(`✅ Tender Create: status=${response.status} (authenticated)`);
  } else {
    check(response, {
      'Tender Create: auth required (401)': (r) => r.status === 401
    });
    console.log(`🔒 Tender Create: status=${response.status} (unauthenticated, expected 401)`);
  }
  
  sleep(0.5);
}
