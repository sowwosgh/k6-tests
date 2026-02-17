import { group, sleep } from 'k6';
import exec from 'k6/execution';

// Import smoke test
import smokeTest from './forms/smoke-test.js';

/**
 * 🚀 REGRESSION TEST SUITE - Simple Version
 * 
 * Запускает smoke test несколько раз для валидации стабильности:
 * - 3 iterations создания всех 10 profile types
 * - Проверяет отсутствие деградации performance
 * - Простая но эффективная regression проверка
 * 
 * Использование:
 * cd k6-tests
 * $env:SESSION_COOKIE="your-session-cookie"
 * k6 run tests/regression-simple.js --quiet
 */

export const options = {
  vus: 1,
  iterations: 3, // Run smoke test 3 times
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.3'],
    checks: ['rate>0.70']
  }
};

export default function() {
  const iteration = exec.scenario.iterationInTest + 1;
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 REGRESSION TEST - Iteration ${iteration}/3`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  smokeTest();
  
  console.log(`✅ Iteration ${iteration} completed\n`);
  
  if (iteration < 3) {
    sleep(3); // Pause between iterations
  }
}

/**
 * Summary handler - выводит финальные метрики
 */
export function handleSummary(data) {
  const totalChecks = data.metrics.checks.values.passes + data.metrics.checks.values.fails;
  const checkRate = (data.metrics.checks.values.passes / totalChecks * 100).toFixed(2);
  const failedRequests = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0;
  const totalRequests = data.metrics.http_reqs.values.count;
  const failRate = (failedRequests / totalRequests * 100).toFixed(2);
  
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              REGRESSION TEST SUMMARY (3x)                 ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Checks Passed:    ${data.metrics.checks.values.passes}/${totalChecks} (${checkRate}%)`.padEnd(60) + '║');
  console.log(`║  ❌ Checks Failed:    ${data.metrics.checks.values.fails}`.padEnd(60) + '║');
  console.log(`║  📊 Total Requests:   ${totalRequests}`.padEnd(60) + '║');
  console.log(`║  ⚠️  Failed Requests: ${failedRequests} (${failRate}%)`.padEnd(60) + '║');
  console.log(`║  ⏱️  Avg Duration:    ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`.padEnd(60) + '║');
  console.log(`║  📈 P(95) Duration:   ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`.padEnd(60) + '║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Определяем статус теста
  const testPassed = checkRate >= 70 && failRate < 30;
  
  if (testPassed) {
    console.log('🎉 REGRESSION TEST PASSED - Готов к staging deployment!');
  } else {
    console.log('⚠️  REGRESSION TEST FAILED - Есть критические проблемы!');
  }
  console.log('');
  
  return {
    'stdout': '', // k6 сам выведет метрики
  };
}
