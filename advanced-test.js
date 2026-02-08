import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Кастомные метрики
const responseTime = new Trend('response_time');
const successRate = new Rate('success_rate');
const requests = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up до 10 пользователей
    { duration: '1m', target: 10 },    // Держим 10 пользователей
    { duration: '30s', target: 0 },    // Ramp-down до 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% запросов < 500ms
    'success_rate': ['rate>0.95'],     // Успешных > 95%
  },
};

export default function () {
  const res = http.get('https://httpbin.test.k6.io/get');
  
  // Кастомные метрики
  responseTime.add(res.timings.duration);
  successRate.add(res.status === 200);
  requests.add(1);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1); // Пауза между запросами
}

// Функция для красивого вывода
export function handleSummary(data) {
  console.log('Preparing summary report...');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}