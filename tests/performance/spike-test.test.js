import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL } from '../../../config.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Normal load
    { duration: '10s', target: 500 },   // SPIKE! 10x increase
    { duration: '2m', target: 500 },    // Hold spike
    { duration: '30s', target: 50 },    // Recovery
    { duration: '10s', target: 1000 },  // MEGA SPIKE!
    { duration: '1m', target: 1000 },   // Hold mega spike
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<10000'], // 95% under 10s during spike
    'http_req_failed': ['rate<0.2'],       // Less than 20% failure
    'errors': ['rate<0.2'],
  },
};

export default function () {
  const endpoints = [
    `${BASE_URL}/api/feed`,
    `${BASE_URL}/api/search/workers`,
    `${BASE_URL}/api/search/vacancies`,
    `${BASE_URL}/api/worker/1`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(endpoint);

  const success = check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    'response received': (r) => r.body.length > 0,
  });

  errorRate.add(!success);

  sleep(Math.random() * 2); // Random think time
}

export function handleSummary(data) {
  console.log('Spike Test Summary:');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`Max Spike: 1000 VUs`);
  console.log('System should recover gracefully after spike');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
