import { group } from 'k6';
import { sleep } from 'k6';

/**
 * 🧪 SMOKE TEST — Быстрая проверка всех создателей профилей
 * 
 * Запускает только CREATE операции для всех 10 типов профилей
 * Цель: Убедиться что все endpoint'ы доступны и работают
 * 
 * Использование:
 *   SESSION_COOKIE="..." k6 run tests/forms/smoke-test.js
 */

import workerCreate from './worker-create.js';
import brigadeCreate from './brigade-create.js';
import contractorCreate from './contractor-create.js';
import customerCreate from './customer-create.js';
import employerCreate from './employer-create.js';
import companyCreate from './company-create.js';
import vacancyCreate from './vacancy-create.js';
import resumeCreate from './resume-create.js';
import orderCreate from './order-create.js';
import tenderCreate from './tender-create.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.70'],           // 70% минимум (может быть валидация)
    http_req_failed: ['rate<0.3']    // Менее 30% ошибок
  }
};

export default function() {
  console.log('🚀 Starting smoke test: CREATE operations only...');
  
  group('📝 Profile Creation Tests', () => {
    group('1. Worker', () => { workerCreate(); sleep(0.5); });
    group('2. Brigade', () => { brigadeCreate(); sleep(0.5); });
    group('3. Contractor', () => { contractorCreate(); sleep(0.5); });
    group('4. Customer', () => { customerCreate(); sleep(0.5); });
    group('5. Employer', () => { employerCreate(); sleep(0.5); });
    group('6. Company', () => { companyCreate(); sleep(0.5); });
  });
  
  group('📋 Listing Creation Tests', () => {
    group('7. Vacancy', () => { vacancyCreate(); sleep(0.5); });
    group('8. Resume', () => { resumeCreate(); sleep(0.5); });
    group('9. Order', () => { orderCreate(); sleep(0.5); });
    group('10. Tender', () => { tenderCreate(); sleep(0.5); });
  });
  
  console.log('✅ Smoke test completed');
}
