import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL } from '../../../config.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '5m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 300 },  // Ramp to 300 users
    { duration: '5m', target: 400 },  // Ramp to 400 users - find breaking point
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'], // 95% of requests should be below 5s
    'http_req_failed': ['rate<0.1'],      // Less than 10% failure rate
    'errors': ['rate<0.1'],
  },
};

export default function () {
  const endpoints = [
    `${BASE_URL}/api/feed`,
    `${BASE_URL}/api/search/workers`,
    `${BASE_URL}/api/worker/1`,
    `${BASE_URL}/api/vacancy/1`,
    `${BASE_URL}/api/feed?type=worker&city=Москва`,
  ];

  // Random endpoint selection
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(endpoint);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 5000,
  });

  errorRate.add(!success);

  sleep(1);
}

export function handleSummary(data) {
  console.log('Stress Test Summary:');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`Max Users Reached: 400 VUs`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
