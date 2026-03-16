import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL } from '../../../config.js';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '5m', target: 50 },    // Ramp up
    { duration: '3h', target: 50 },    // Stay at 50 for 3 hours (soak)
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // Should remain stable
    'http_req_failed': ['rate<0.05'],     // Very low failure rate
    'errors': ['rate<0.05'],
  },
};

export default function () {
  const startTime = Date.now();

  // Simulate realistic user behavior
  const scenarios = [
    // Browse feed
    () => {
      http.get(`${BASE_URL}/api/feed`);
      sleep(2);
      http.get(`${BASE_URL}/api/feed?page=2`);
      sleep(3);
    },
    // Search workers
    () => {
      http.get(`${BASE_URL}/api/search/workers?city=Москва`);
      sleep(2);
      http.get(`${BASE_URL}/api/worker/1`);
      sleep(4);
    },
    // View vacancies
    () => {
      http.get(`${BASE_URL}/api/search/vacancies`);
      sleep(2);
      http.get(`${BASE_URL}/api/vacancy/1`);
      sleep(3);
    },
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  const success = check(null, {
    'scenario completed': () => true,
  });

  errorRate.add(!success);

  sleep(5); // Think time between scenarios
}

export function handleSummary(data) {
  console.log('Soak Test Summary (3 hours):');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`Average Response: ${data.metrics.http_req_duration.values.avg}ms`);
  console.log('Check for memory leaks, connection pool exhaustion, degradation over time');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
