import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { authHeaders } from '../../utils/auth.js';
import { 
  checkViewOperation,
  checkContactsPaywall,
  checkUIStructure,
  checkRequiredFields
} from '../../utils/form-helper.js';

/**
 * 🧪 FEED VIEWER COMPLETE TEST — FeedViewerRule для всех 8 профилей
 * 
 * Проверяет просмотр профилей из ленты с paywall контактов
 * Тестирует:
 * ✅ Worker, Brigade, Contractor, Customer (профили)
 * ✅ Vacancy, Resume, Order, Tender (листинги)
 * 
 * Использование:
 *   SESSION_COOKIE="..." npm run test:feed-viewer:complete
 * 
 * Или без авторизации (публичный просмотр):
 *   npm run test:feed-viewer:complete
 * 
 * Проверяет:
 * 1. Форма открывается (status 200)
 * 2. Все обязательные поля присутствуют
 * 3. UI-поля для карточек доступны
 * 4. Paywall контактов работает (is_masked, unlock_price)
 * 5. Контакты замаскированы для чужих профилей
 * 6. Правильный тип профиля возвращается
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

// ID профилей для тестирования (передаются через env vars или дефолтные)
const WORKER_ID = __ENV.WORKER_ID || '1';
const BRIGADE_ID = __ENV.BRIGADE_ID || '1';
const CONTRACTOR_ID = __ENV.CONTRACTOR_ID || '1';
const CUSTOMER_ID = __ENV.CUSTOMER_ID || '1';
const VACANCY_ID = __ENV.VACANCY_ID || '1';
const RESUME_ID = __ENV.RESUME_ID || '1';
const ORDER_ID = __ENV.ORDER_ID || '1';
const TENDER_ID = __ENV.TENDER_ID || '1';

// Флаг владения профилем (false = чужой профиль, должен быть paywall)
const IS_OWN_PROFILE = __ENV.IS_OWN_PROFILE === 'true';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.85'], // Минимум 85% проверок должны пройти
    http_req_failed: ['rate<0.15']
  }
};

// ═══════════════════════════════════════════════════════════════════════
// ОБЩАЯ ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ ПРОСМОТРА ПРОФИЛЯ
// ═══════════════════════════════════════════════════════════════════════
function testProfileView(type, id, requiredFields, uiFields, hasPaywall = true) {
  const url = `${BASE_URL}/api/${type}/${id}`;
  
  console.log(`👀 Просмотр ${type} ID=${id} (paywall: ${hasPaywall && !IS_OWN_PROFILE})...`);
  
  const response = http.get(url, {
    headers: authHeaders(),
    tags: { name: `${type}View` }
  });

  // 1️⃣ Проверка открытия
  checkViewOperation(response, `${type} View`, type);
  
  // 2️⃣ Проверка обязательных полей
  checkRequiredFields(response, `${type} View`, requiredFields);
  
  // 3️⃣ Проверка UI-структуры
  checkUIStructure(response, `${type} View`, uiFields);
  
  // 4️⃣ Проверка paywall (только для профилей с контактами)
  if (hasPaywall) {
    checkContactsPaywall(response, `${type} View`, IS_OWN_PROFILE);
  }
  
  // 5️⃣ Дополнительная детальная проверка маскировки телефона
  if (hasPaywall && !IS_OWN_PROFILE) {
    check(response, {
      [`${type} View: телефон замаскирован (содержит ***)`]: (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.contact_phone && data.contact_phone.includes('***');
        } catch (e) {
          return false;
        }
      },
      [`${type} View: есть цена разблокировки`]: (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.unlock_price !== undefined && data.unlock_price > 0;
        } catch (e) {
          return false;
        }
      }
    });
  }
  
  console.log(`${response.status === 200 ? '✅' : '❌'} ${type} View: status=${response.status}`);
  return response;
}

// ═══════════════════════════════════════════════════════════════════════
// ОСНОВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ
// ═══════════════════════════════════════════════════════════════════════
export default function() {
  console.log('🚀 Starting FeedViewerRule Complete Test...\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔐 Auth: ${authHeaders()['Cookie'] ? 'Authenticated' : 'Anonymous'}`);
  console.log(`👤 Profile access: ${IS_OWN_PROFILE ? 'Owner (full access)' : 'Viewer (paywall)'}\n`);
  
  // ═══════════════════════════════════════════════════════════
  // 📋 ПРОФИЛИ С PAYWALL
  // ═══════════════════════════════════════════════════════════
  
  group('1. 👷 Worker Profile', () => {
    testProfileView(
      'worker',
      WORKER_ID,
      ['id', 'full_name', 'specialization', 'work_city', 'status'],
      ['full_name', 'specialization', 'work_city', 'salary_amount', 'experience_years', 'contact_phone'],
      true // paywall enabled
    );
    sleep(0.3);
  });

  group('2. 👥 Brigade Profile', () => {
    testProfileView(
      'brigade',
      BRIGADE_ID,
      ['id', 'name', 'leader_name', 'team_size', 'specs', 'work_city', 'status'],
      ['name', 'leader_name', 'team_size', 'specs', 'work_city', 'contact_phone', 'status'],
      true
    );
    sleep(0.3);
  });

  group('3. 🏗️ Contractor Profile', () => {
    testProfileView(
      'contractor',
      CONTRACTOR_ID,
      ['id', 'company_name', 'legal_form', 'inn', 'services', 'work_city', 'status'],
      ['company_name', 'legal_form', 'inn', 'services', 'work_city', 'contact_person', 'contact_phone', 'status'],
      true
    );
    sleep(0.3);
  });

  group('4. 🏠 Customer Profile', () => {
    testProfileView(
      'customer',
      CUSTOMER_ID,
      ['id', 'company_name', 'inn', 'city'],
      ['company_name', 'inn', 'customer_type', 'city', 'contact_person', 'contact_phone', 'about'],
      true
    );
    sleep(0.3);
  });

  // ═══════════════════════════════════════════════════════════
  // 📋 ЛИСТИНГИ С PAYWALL
  // ═══════════════════════════════════════════════════════════

  group('5. 💼 Vacancy Listing', () => {
    testProfileView(
      'vacancy',
      VACANCY_ID,
      ['id', 'title', 'company_name', 'city', 'phone'],
      ['title', 'company_name', 'city', 'specialization', 'salary_min', 'salary_max', 'phone'],
      true
    );
    sleep(0.3);
  });

  group('6. 📄 Resume Listing', () => {
    testProfileView(
      'resume',
      RESUME_ID,
      ['id', 'full_name', 'desired_position', 'city', 'phone'],
      ['full_name', 'age', 'desired_position', 'salary', 'city', 'experience_years', 'phone'],
      true
    );
    sleep(0.3);
  });

  group('7. 📋 Order Listing', () => {
    testProfileView(
      'order',
      ORDER_ID,
      ['id', 'title', 'work_type', 'city', 'description'],
      ['title', 'work_type', 'city', 'description', 'budget', 'deadline', 'phone'],
      true
    );
    sleep(0.3);
  });

  group('8. 📢 Tender Listing', () => {
    testProfileView(
      'tender',
      TENDER_ID,
      ['id', 'title', 'tender_type', 'city', 'object_address', 'description', 'requirements', 'submission_deadline'],
      ['title', 'tender_number', 'tender_type', 'city', 'object_address', 'description', 'budget_min', 'budget_max', 'submission_deadline', 'phone'],
      true
    );
    sleep(0.3);
  });

  console.log('\n✅ FeedViewerRule Complete Test finished!');
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM SUMMARY — красивый вывод результатов
// ═══════════════════════════════════════════════════════════════════════
export function handleSummary(data) {
  // Подсчет метрик
  const checksPassed = data.metrics.checks ? data.metrics.checks.passes : 0;
  const checksFailed = data.metrics.checks ? data.metrics.checks.fails : 0;
  const checksTotal = checksPassed + checksFailed;
  const checkRate = checksTotal > 0 ? ((checksPassed / checksTotal) * 100).toFixed(2) : 0;
  
  const failedRate = data.metrics.http_req_failed 
    ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) 
    : 0;
  
  const avgDuration = data.metrics.http_req_duration 
    ? data.metrics.http_req_duration.values.avg.toFixed(0) 
    : 0;
  
  const p95Duration = data.metrics.http_req_duration 
    ? data.metrics.http_req_duration.values['p(95)'].toFixed(0) 
    : 0;

  // Красивый вывод
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     📊 FEED VIEWER COMPLETE TEST — SUMMARY               ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Checks Passed:    ${checksPassed}/${checksTotal} (${checkRate}%)${' '.repeat(Math.max(0, 24 - checksPassed.toString().length))}║`);
  console.log(`║  ❌ Checks Failed:    ${checksFailed}${' '.repeat(Math.max(0, 38 - checksFailed.toString().length))}║`);
  console.log(`║  🌐 HTTP Failures:    ${failedRate}% requests${' '.repeat(Math.max(0, 27 - failedRate.toString().length))}║`);
  console.log(`║  ⏱️  Avg Duration:     ${avgDuration}ms${' '.repeat(Math.max(0, 36 - avgDuration.toString().length))}║`);
  console.log(`║  📈 P95 Duration:     ${p95Duration}ms${' '.repeat(Math.max(0, 36 - p95Duration.toString().length))}║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  ✅ Tested Components:                                    ║');
  console.log('║     • Worker Profile (FeedViewerRule)                     ║');
  console.log('║     • Brigade Profile (FeedViewerRule)                    ║');
  console.log('║     • Contractor Profile (FeedViewerRule)                 ║');
  console.log('║     • Customer Profile (FeedViewerRule)                   ║');
  console.log('║     • Vacancy Listing (FeedViewerRule)                    ║');
  console.log('║     • Resume Listing (FeedViewerRule)                     ║');
  console.log('║     • Order Listing (FeedViewerRule)                      ║');
  console.log('║     • Tender Listing (FeedViewerRule)                     ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  🔍 Validated:                                            ║');
  console.log('║     ✓ Form opening (status 200)                           ║');
  console.log('║     ✓ Required fields presence                            ║');
  console.log('║     ✓ UI structure for cards                              ║');
  console.log('║     ✓ Paywall functionality (is_masked, unlock_price)     ║');
  console.log('║     ✓ Phone masking (*** in numbers)                      ║');
  console.log('║     ✓ Profile type validation                             ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  
  // Итоговый статус
  const overallStatus = checkRate >= 85 && failedRate < 15 ? '✅ PASSED' : '❌ FAILED';
  console.log(`║  🎯 Overall Status:   ${overallStatus}${' '.repeat(Math.max(0, 33 - overallStatus.length))}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Возврат стандартного summary
  return {
    'stdout': '',
  };
}
