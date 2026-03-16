/**
 * Quick Stress Test — находим предел сервера за 10 минут
 * 10 → 50 → 100 → 200 VU → плавное снижение
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const errorRate = new Rate('error_rate');
const feedDuration = new Trend('feed_duration');

export const options = {
  stages: [
    { duration: '1m', target: 10  },  // Разогрев
    { duration: '2m', target: 50  },  // Умеренная нагрузка
    { duration: '2m', target: 100 },  // Высокая нагрузка
    { duration: '2m', target: 200 },  // Пиковая нагрузка
    { duration: '2m', target: 0   },  // Охлаждение
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed':   ['rate<0.20'],
    'error_rate':        ['rate<0.20'],
  },
};

export default function () {
  const endpoints = [
    `${BASE_URL}/api/feed?page=1&page_size=10`,
    `${BASE_URL}/api/feed?page=1&page_size=10&type=vacancy`,
    `${BASE_URL}/api/feed?page=1&page_size=10&type=order`,
    `${BASE_URL}/api/feed?page=1&page_size=10&type=tender`,
  ];

  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(url, { headers: { 'Content-Type': 'application/json' } });

  feedDuration.add(res.timings.duration);

  const ok = check(res, {
    'статус 200': (r) => r.status === 200,
    'ответ < 5s':  (r) => r.timings.duration < 5000,
  });

  errorRate.add(!ok);
  sleep(1);
}

export function handleSummary(data) {
  const p50  = Math.round(data.metrics.http_req_duration.values['p(50)']);
  const p95  = Math.round(data.metrics.http_req_duration.values['p(95)']);
  const p99  = Math.round(data.metrics.http_req_duration.values['p(99)']);
  const max  = Math.round(data.metrics.http_req_duration.values.max);
  const fail = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
  const rps  = data.metrics.http_reqs.values.rate.toFixed(1);
  const total = data.metrics.http_reqs.values.count;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  SOWWOS STRESS TEST — ${BASE_URL}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  Всего запросов:     ${total}`);
  console.log(`  Запросов/сек:       ${rps} req/s`);
  console.log(`  Ошибок:             ${fail}%`);
  console.log(`  Время ответа P50:   ${p50}ms`);
  console.log(`  Время ответа P95:   ${p95}ms`);
  console.log(`  Время ответа P99:   ${p99}ms`);
  console.log(`  Максимум:           ${max}ms`);

  let verdict = '';
  if (parseFloat(fail) < 1 && p95 < 1000) {
    verdict = '✅ ОТЛИЧНО — сервер уверенно держит нагрузку';
  } else if (parseFloat(fail) < 5 && p95 < 2000) {
    verdict = '⚠️  УДОВЛЕТВОРИТЕЛЬНО — деградация под нагрузкой';
  } else {
    verdict = '❌ ПРОБЛЕМЫ — сервер не справляется';
  }
  console.log(`\n  ${verdict}`);
  console.log(`${'='.repeat(50)}\n`);

  return {};
}
