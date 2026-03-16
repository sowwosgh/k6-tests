/**
 * Production Smoke Test — запускается после каждого деплоя
 * Проверяет 5 критичных точек: лента, поиск, авторизация, профили, API health
 *
 * Запуск: k6 run tests/smoke/production-smoke.js
 * Против локального: BASE_URL=http://localhost:8000 k6 run tests/smoke/production-smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    // http_req_failed не используем — тест намеренно посылает неверный логин (4xx)
    // Главный индикатор качества — checks
    checks: ['rate==1.0'],   // 100% checks must pass
  },
};

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Главная страница
  const homeRes = http.get(`${BASE_URL}/`, { headers });
  check(homeRes, {
    '✅ Главная: статус 200': (r) => r.status === 200,
    '✅ Главная: тело не пустое': (r) => r.body.length > 100,
  });
  sleep(0.5);

  // 2. API лента
  const feedRes = http.get(`${BASE_URL}/api/feed?page=1&page_size=3`, { headers });
  check(feedRes, {
    '✅ Лента API: статус 200': (r) => r.status === 200,
    '✅ Лента API: JSON ответ': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });
  sleep(0.5);

  // 3. Поиск
  const searchRes = http.get(`${BASE_URL}/api/feed?search=специалист&page=1`, { headers });
  check(searchRes, {
    '✅ Поиск API: статус 200': (r) => r.status === 200,
  });
  sleep(0.5);

  // 4. Неверный логин — проверяем что API отвечает (не 500)
  // expectedStatuses: 400/401 не считаются ошибкой k6 (намеренно неверные данные)
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ phone: '+70000000000', password: 'wrongpass' }),
    { headers }
  );
  check(loginRes, {
    '✅ Auth API: отвечает (не 500)': (r) => r.status !== 500 && r.status !== 502 && r.status !== 503,
    '✅ Auth API: JSON ответ': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });
  sleep(0.5);

  // 5. Список вакансий (публичный)
  const vacancyRes = http.get(`${BASE_URL}/api/vacancies?page=1&page_size=3`, { headers });
  check(vacancyRes, {
    '✅ Вакансии API: статус 200 или 404': (r) => r.status === 200 || r.status === 404,
    '✅ Вакансии API: не упал': (r) => r.status < 500,
  });
}

export function handleSummary(data) {
  const passed = data.metrics.checks ? data.metrics.checks.values.passes : 0;
  const failed = data.metrics.checks ? data.metrics.checks.values.fails : 0;
  const total = passed + failed;
  const p95 = data.metrics.http_req_duration
    ? Math.round(data.metrics.http_req_duration.values['p(95)'])
    : '?';

  const status = failed === 0 ? '✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : `❌ ПРОВАЛЕНО ${failed}/${total} ПРОВЕРОК`;

  console.log(`\n========================================`);
  console.log(`  SOWWOS PRODUCTION SMOKE TEST`);
  console.log(`  ${BASE_URL}`);
  console.log(`========================================`);
  console.log(`  ${status}`);
  console.log(`  Проверок: ${passed}/${total} пройдено`);
  console.log(`  P95 время ответа: ${p95}ms`);
  console.log(`========================================\n`);

  return {};
}
