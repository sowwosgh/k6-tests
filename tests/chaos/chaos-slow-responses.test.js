import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const slowRate = new Rate('slow_responses');
const timeoutRate = new Rate('timeouts');
const degradedResponseTime = new Trend('degraded_response_time');

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    'http_req_duration': ['p(95)<15000'], // More lenient for slow responses
    'timeouts': ['rate<0.1'], // Less than 10% timeouts
  },
};

// Inject random delays into requests
function simulateSlowResponse() {
  const scenarios = [
    { probability: 0.1, delay: 5000, type: 'Slow DB Query' },
    { probability: 0.05, delay: 10000, type: 'Very Slow Response' },
    { probability: 0.03, delay: 30000, type: 'Near Timeout' },
    { probability: 0.02, delay: 60000, type: 'Timeout Trigger' },
  ];

  for (const scenario of scenarios) {
    if (Math.random() < scenario.probability) {
      console.log(`CHAOS: Simulated ${scenario.type} (${scenario.delay}ms delay)`);
      sleep(scenario.delay / 1000);
      return scenario.delay;
    }
  }

  return 0;
}

export default function () {
  const authHeaders = getAuthHeaders();

  const endpoints = [
    `${BASE_URL}/api/feed`,
    `${BASE_URL}/api/search/workers`,
    `${BASE_URL}/api/worker/1`,
    `${BASE_URL}/api/applications`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  // Inject artificial delay before request
  const artificialDelay = simulateSlowResponse();

  const startTime = Date.now();
  const res = http.get(endpoint, {
    headers: authHeaders,
    timeout: '60s', // Allow long timeouts
  });
  const actualDuration = Date.now() - startTime;

  const isSlow = actualDuration > 3000;
  const isTimeout = res.status === 0 || actualDuration > 30000;

  slowRate.add(isSlow ? 1 : 0);
  timeoutRate.add(isTimeout ? 1 : 0);
  degradedResponseTime.add(actualDuration);

  check(res, {
    'request completed': (r) => r.status !== 0,
    'no server crash': (r) => r.status !== 500,
    'response received eventually': (r) => r.body !== undefined,
  });

  // Log slow responses
  if (isSlow) {
    console.log(`SLOW: ${endpoint} took ${actualDuration}ms`);
  }

  sleep(1);
}

export function handleSummary(data) {
  console.log('Chaos Slow Responses Test Summary:');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Slow Responses (>3s): ${data.metrics.slow_responses.values.rate * 100}%`);
  console.log(`Timeouts: ${data.metrics.timeouts.values.rate * 100}%`);
  console.log(`Average Degraded Response Time: ${data.metrics.degraded_response_time.values.avg}ms`);
  console.log('System should handle slow responses with timeouts, circuit breakers');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
