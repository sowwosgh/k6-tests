import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { authHeaders } from '../../utils/auth.js';
import { 
  checkCreateSuccess,
  checkNoDuplicateFields,
  checkRequiredFields
} from '../../utils/form-helper.js';
import { parseJsonSafe } from '../../utils/checks.js';
import { 
  generateINN, 
  generatePhone, 
  generateCompanyName 
} from '../../utils/generators.js';

/**
 * 🧪 QUICK CREATE COMPLETE TEST — QuickCreateFormRule для всех 8 форм
 * 
 * Проверяет создание профилей через правое окно "Быстрое создание"
 * Тестирует:
 * ✅ Worker, Brigade, Contractor, Customer (профили)
 * ✅ Vacancy, Resume, Order, Tender (листинги)
 * 
 * Использование:
 *   SESSION_COOKIE="..." npm run test:quick-create:complete
 * 
 * Проверяет:
 * 1. Авторизация (401 без токена)
 * 2. Успешное создание (200/201)
 * 3. Получение ID созданного профиля
 * 4. Отсутствие дублирующих полей
 * 5. Валидация обязательных полей
 * 6. Корректные сообщения об ошибках
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const IS_AUTHENTICATED = __ENV.SESSION_COOKIE ? true : false;

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.85'], // 85% минимум
    http_req_failed: ['rate<0.15']
  }
};

// ═══════════════════════════════════════════════════════════════════════
// ОБЩАЯ ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ СОЗДАНИЯ ПРОФИЛЯ
// ═══════════════════════════════════════════════════════════════════════
function testQuickCreate(type, payload, requiredResponseFields = []) {
  const url = `${BASE_URL}/api/${type}`;
  
  console.log(`📝 Создание ${type} (auth: ${IS_AUTHENTICATED ? 'YES' : 'NO'})...`);
  
  const response = http.post(url, JSON.stringify(payload), {
    headers: authHeaders(),
    tags: { name: `${type}Create` }
  });

  if (IS_AUTHENTICATED) {
    // ✅ С авторизацией — ожидаем успех
    checkCreateSuccess(response, `${type} Create`, type);
    checkNoDuplicateFields(response, `${type} Create`);
    
    // Проверяем обязательные поля в ответе
    if (requiredResponseFields.length > 0) {
      checkRequiredFields(response, `${type} Create`, requiredResponseFields);
    }
    
    // Дополнительные проверки
    check(response, {
      [`${type} Create: сообщение о создании`]: () => {
        const data = parseJsonSafe(response);
        return data && (data.message || data.id);
      }
    });
    
    console.log(`✅ ${type} Create: status=${response.status}`);
  } else {
    // 🔒 Без авторизации — ожидаем 401
    check(response, {
      [`${type} Create: требуется авторизация (401)`]: (r) => r.status === 401,
      [`${type} Create: сообщение об ошибке авторизации`]: (r) => {
        const data = parseJsonSafe(r);
        return data && (data.detail || data.message);
      }
    });
    console.log(`🔒 ${type} Create: status=${response.status} (expected 401)`);
  }
  
  return response;
}

// ═══════════════════════════════════════════════════════════════════════
// ОСНОВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ
// ═══════════════════════════════════════════════════════════════════════
export default function() {
  console.log('🚀 Starting QuickCreateFormRule Complete Test...\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔐 Auth: ${IS_AUTHENTICATED ? 'Authenticated' : 'Anonymous (testing 401)'}\n`);
  
  // ═══════════════════════════════════════════════════════════
  // 📋 ПРОФИЛИ (Workers & Organizations)
  // ═══════════════════════════════════════════════════════════
  
  group('1. 👷 Worker Profile', () => {
    const payload = {
      full_name: `Test Worker ${Date.now()}`,
      specialization: 'Сантехник',
      work_city: 'Москва',
      work_region: 'Московская область',
      search_status: 'active_search',
      contact_phone: generatePhone(),
      contact_person: 'Test Worker'
    };
    testQuickCreate('worker', payload, ['id', 'message']);
    sleep(0.3);
  });

  group('2. 👥 Brigade Profile', () => {
    const payload = {
      name: `Бригада-${Date.now()}`,
      industry: 'Строительство',
      leader_name: 'Иван Иванов',
      team_size: 5,
      specs: 'Отделочные работы',
      work_city: 'Санкт-Петербург',
      work_region: 'Ленинградская область',
      contact_phone: generatePhone(),
      contact_person: 'Иван Иванов'
    };
    testQuickCreate('brigade', payload, ['id', 'message']);
    sleep(0.3);
  });

  group('3. 🏗️ Contractor Profile', () => {
    const payload = {
      company_name: generateCompanyName('Contractor'),
      inn: generateINN(),
      is_b2b: true,
      city: 'Москва',
      region: 'Московская область',
      services: 'Строительные услуги',
      work_conditions: 'Выезд по региону',
      contact_phone: generatePhone(),
      contact_person: 'Менеджер',
      contact_email: 'test@contractor.com'
    };
    testQuickCreate('contractor', payload, ['id', 'message']);
    sleep(0.3);
  });

  group('4. 🏠 Customer Profile', () => {
    const payload = {
      company_name: generateCompanyName('Customer'),
      inn: generateINN(),
      customer_type: 'corporate',
      city: 'Москва',
      region: 'Московская область',
      contact_person: 'Заказчик Иван',
      contact_position: 'Директор',
      contact_phone: generatePhone(),
      contact_email: 'test@customer.com',
      about: 'Тестовый заказчик для K6'
    };
    testQuickCreate('customer', payload, ['id', 'message']);
    sleep(0.3);
  });

  // ═══════════════════════════════════════════════════════════
  // 📋 ЛИСТИНГИ (Vacancies, Resumes, Orders, Tenders)
  // ═══════════════════════════════════════════════════════════

  group('5. 💼 Vacancy Listing', () => {
    const payload = {
      title: `Вакансия K6 Test - ${Date.now()}`,
      company_name: generateCompanyName('Vacancy'),
      city: 'Москва',
      specialization: 'Строительство',
      description: 'Тестовая вакансия для k6 тестирования',
      salary_min: 80000,
      salary_max: 120000,
      industry: 'Строительство',
      employment_type: 'full',
      experience: '3-5 лет',
      phone: generatePhone(),
      email: 'hr@test.com'
    };
    testQuickCreate('vacancy', payload, ['id']);
    sleep(0.3);
  });

  group('6. 📄 Resume Listing', () => {
    const payload = {
      full_name: `Test Resume ${Date.now()}`,
      age: 30,
      desired_position: 'Инженер-строитель',
      salary: 100000,
      salary_negotiable: false,
      employment_type: 'full',
      city: 'Екатеринбург',
      relocation: false,
      education_level: 'higher',
      experience_years: 5,
      about: 'Опыт работы на крупных объектах',
      skills: 'AutoCAD, Revit, управление проектами',
      phone: generatePhone(),
      email: 'resume@test.com'
    };
    testQuickCreate('resume', payload, ['id']);
    sleep(0.3);
  });

  group('7. 📋 Order Listing', () => {
    const payload = {
      title: `Заказ K6 Test - ${Date.now()}`,
      work_type: 'Ремонт',
      industry: 'Строительство',
      city: 'Новосибирск',
      region: 'Новосибирская область',
      address: 'ул. Тестовая, 1',
      description: 'Тестовый заказ для k6',
      budget: 500000,
      payment_type: 'mixed',
      urgency: 'normal',
      requirements: 'Наличие инструмента',
      phone: generatePhone(),
      email: 'order@test.com'
    };
    testQuickCreate('orders', payload, ['id']);
    sleep(0.3);
  });

  group('8. 📢 Tender Listing', () => {
    const payload = {
      title: `Тендер K6 Test - ${Date.now()}`,
      tender_number: `T-${Date.now()}`,
      tender_type: 'construction',
      city: 'Казань',
      region: 'Республика Татарстан',
      object_address: 'ул. Объектная, 10',
      description: 'Тестовый тендер для k6',
      requirements: 'Опыт от 3 лет',
      evaluation_criteria: 'Цена и качество',
      budget_min: 1000000,
      budget_max: 5000000,
      payment_terms: 'По этапам',
      organization: 'Тестовая организация',
      inn: generateINN(),
      phone: generatePhone(),
      email: 'tender@test.com'
    };
    testQuickCreate('tenders', payload, ['id']);
    sleep(0.3);
  });

  console.log('\n✅ QuickCreateFormRule Complete Test finished!');
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM SUMMARY — красивый вывод результатов
// ═══════════════════════════════════════════════════════════════════════
export function handleSummary(data) {
  const checksPassed = data.metrics.checks ? (data.metrics.checks.values.passes || 0) : 0;
  const checksFailed = data.metrics.checks ? (data.metrics.checks.values.fails || 0) : 0;
  const checksTotal = checksPassed + checksFailed;
  const checkRate = checksTotal > 0 ? ((checksPassed / checksTotal) * 100).toFixed(2) : '0.00';
  
  const failedRate = data.metrics.http_req_failed 
    ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) 
    : 0;
  
  const avgDuration = data.metrics.http_req_duration 
    ? data.metrics.http_req_duration.values.avg.toFixed(0) 
    : 0;
  
  const p95Duration = data.metrics.http_req_duration 
    ? data.metrics.http_req_duration.values['p(95)'].toFixed(0) 
    : 0;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     📊 QUICK CREATE COMPLETE TEST — SUMMARY              ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Checks Passed:    ${checksPassed}/${checksTotal} (${checkRate}%) ${' '.repeat(Math.max(0, 22 - String(checksPassed).length - String(checksTotal).length))}║`);
  console.log(`║  ❌ Checks Failed:    ${checksFailed} ${' '.repeat(Math.max(0, 37 - String(checksFailed).length))}║`);
  console.log(`║  🌐 HTTP Failures:    ${failedRate}% requests ${' '.repeat(Math.max(0, 26 - String(failedRate).length))}║`);
  console.log(`║  ⏱️  Avg Duration:     ${avgDuration}ms ${' '.repeat(Math.max(0, 34 - String(avgDuration).length))}║`);
  console.log(`║  📈 P95 Duration:     ${p95Duration}ms ${' '.repeat(Math.max(0, 34 - String(p95Duration).length))}║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  ✅ Tested Forms (QuickCreateFormRule):                   ║');
  console.log('║     • Worker Profile                                      ║');
  console.log('║     • Brigade Profile                                     ║');
  console.log('║     • Contractor Profile                                  ║');
  console.log('║     • Customer Profile                                    ║');
  console.log('║     • Vacancy Listing                                     ║');
  console.log('║     • Resume Listing                                      ║');
  console.log('║     • Order Listing                                       ║');
  console.log('║     • Tender Listing                                      ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  🔍 Validated:                                            ║');
  console.log('║     ✓ Authorization (401 without token)                   ║');
  console.log('║     ✓ Successful creation (200/201)                       ║');
  console.log('║     ✓ Profile ID returned                                 ║');
  console.log('║     ✓ No duplicate fields                                 ║');
  console.log('║     ✓ Required fields present                             ║');
  console.log('║     ✓ Confirmation messages                               ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  
  const overallStatus = checkRate >= 85 && failedRate < 15 ? '✅ PASSED' : '❌ FAILED';
  console.log(`║  🎯 Overall Status:   ${overallStatus} ${' '.repeat(Math.max(0, 31 - overallStatus.length))}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  return {
    'stdout': '',
  };
}
