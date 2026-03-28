import { group, sleep } from 'k6';

/**
 * 🖼️ AVATAR TEST SUITE
 *
 * Запускает все тесты аватаров для всех 9 типов карточек:
 * — Профили: worker, brigade, contractor, customer, employer
 * — Публикации: vacancy, order, tender
 * — Фид: проверка что avatar = URL или null (не emoji)
 * — Профили: список профилей без emoji аватаров
 *
 * Использование:
 *   SESSION_COOKIE="..." k6 run tests/avatar-suite.js
 *   BASE_URL=https://sowwos.ru k6 run tests/avatar-suite.js
 */

import avatarSecurity from './api/security/avatar-upload-security.test.js';
import workerAvatar from './api/profiles/avatar-worker.test.js';
import brigadeAvatar from './api/profiles/avatar-brigade.test.js';
import contractorAvatar from './api/profiles/avatar-contractor.test.js';
import customerAvatar from './api/profiles/avatar-customer.test.js';
import employerAvatar from './api/profiles/avatar-employer.test.js';
import vacancyAvatar from './api/listings/avatar-vacancy.test.js';
import orderAvatar from './api/listings/avatar-order.test.js';
import tenderAvatar from './api/listings/avatar-tender.test.js';
import feedAvatarFields from './api/feed/feed-avatar-fields.test.js';
import profilesAvatarFields from './api/profiles/profiles-avatar-fields.test.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         AVATAR TEST SUITE                ║');
  console.log('╚══════════════════════════════════════════╝');

  group('👷 Worker Avatar', () => { workerAvatar(); sleep(1); });
  group('👥 Brigade Avatar', () => { brigadeAvatar(); sleep(1); });
  group('🏗️ Contractor Avatar', () => { contractorAvatar(); sleep(1); });
  group('👑 Customer Logo', () => { customerAvatar(); sleep(1); });
  group('💼 Employer Logo', () => { employerAvatar(); sleep(1); });
  group('🏢 Vacancy Avatar', () => { vacancyAvatar(); sleep(1); });
  group('📦 Order Avatar', () => { orderAvatar(); sleep(1); });
  group('🏆 Tender Avatar', () => { tenderAvatar(); sleep(1); });
  group('📋 Feed Avatar Fields', () => { feedAvatarFields(); sleep(1); });
  group('👤 Profiles Avatar Fields', () => { profilesAvatarFields(); sleep(1); });
  group('🔒 Avatar Upload Security', () => { avatarSecurity(); });

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         AVATAR SUITE COMPLETED           ║');
  console.log('╚══════════════════════════════════════════╝');
}

export function handleSummary(data) {
  const passes = data.metrics.checks.values.passes;
  const fails = data.metrics.checks.values.fails;
  const total = passes + fails;
  const rate = total > 0 ? (passes / total * 100).toFixed(1) : '0.0';
  const p95 = data.metrics.http_req_duration.values['p(95)'].toFixed(0);
  const reqCount = data.metrics.http_reqs.values.count;

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║              AVATAR SUITE SUMMARY                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  ✅ Checks:    ${passes}/${total} (${rate}%)`.padEnd(51) + '║');
  console.log(`║  ❌ Failed:    ${fails}`.padEnd(51) + '║');
  console.log(`║  📊 Requests:  ${reqCount}`.padEnd(51) + '║');
  console.log(`║  ⏱️  P95:       ${p95}ms`.padEnd(51) + '║');
  console.log('╚══════════════════════════════════════════════════╝');

  const passed = parseFloat(rate) >= 90;
  console.log(passed
    ? '🎉 AVATAR SUITE PASSED'
    : '⚠️  AVATAR SUITE FAILED — проверь логи выше'
  );
  console.log('');

  return { stdout: '' };
}
