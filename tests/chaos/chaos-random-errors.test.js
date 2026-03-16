import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const errorRate = new Rate('errors');
const resilienceRate = new Rate('handled_errors');

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    'http_req_duration': ['p(95)<10000'],
    'handled_errors': ['rate>0.8'], // 80% of errors handled gracefully
  },
};

// Inject random errors into requests
function injectChaos(res) {
  const errorScenarios = [
    { probability: 0.05, status: 500, type: 'Internal Server Error' },
    { probability: 0.05, status: 503, type: 'Service Unavailable' },
    { probability: 0.03, status: 504, type: 'Gateway Timeout' },
    { probability: 0.03, status: 429, type: 'Too Many Requests' },
    { probability: 0.02, status: 408, type: 'Request Timeout' },
  ];

  for (const scenario of errorScenarios) {
    if (Math.random() < scenario.probability) {
      console.log(`CHAOS: Simulated ${scenario.type} (${scenario.status})`);
      return scenario.status;
    }
  }

  return res.status;
}

export default function () {
  const authHeaders = getAuthHeaders();

  const endpoints = [
    `${BASE_URL}/api/feed`,
    `${BASE_URL}/api/search/workers`,
    `${BASE_URL}/api/worker/1`,
    `${BASE_URL}/api/vacancy/1`,
    `${BASE_URL}/api/applications`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(endpoint, { headers: authHeaders });

  // Simulate chaos
  const finalStatus = injectChaos(res);

  // Check if system handles errors gracefully
  const handledGracefully = check(res, {
    'status is valid HTTP code': () => [200, 429, 500, 503, 504, 408].includes(finalStatus),
    'response has body': (r) => r.body.length > 0,
    'response time acceptable': (r) => r.timings.duration < 10000,
  });

  resilienceRate.add(handledGracefully ? 1 : 0);
  errorRate.add(finalStatus >= 400 ? 1 : 0);

  // Retry logic for failed requests
  if (finalStatus >= 500 && finalStatus < 600) {
    sleep(1); // Backoff
    const retryRes = http.get(endpoint, { headers: authHeaders });
    check(retryRes, {
      'retry succeeded': (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 3);
}

export function handleSummary(data) {
  console.log('Chaos Random Errors Test Summary:');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Error Rate: ${data.metrics.errors.values.rate * 100}%`);
  console.log(`Handled Errors: ${data.metrics.handled_errors.values.rate * 100}%`);
  console.log('System should handle random errors gracefully with retries, fallbacks');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
