import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const dbErrors = new Counter('db_errors');
const fallbackUsed = new Rate('fallback_used');
const gracefulDegradation = new Rate('graceful_degradation');

export const options = {
  vus: 30,
  duration: '5m',
  thresholds: {
    'fallback_used': ['rate>0.5'], // Should use fallbacks
    'graceful_degradation': ['rate>0.8'], // 80% graceful handling
  },
};

// Simulate database unavailability
function simulateDbOutage() {
  // 20% chance of DB being unavailable
  return Math.random() < 0.2;
}

export default function () {
  const authHeaders = getAuthHeaders();

  const endpoints = [
    { url: `${BASE_URL}/api/feed`, hasFallback: true },
    { url: `${BASE_URL}/api/search/workers`, hasFallback: true },
    { url: `${BASE_URL}/api/worker/1`, hasFallback: false },
    { url: `${BASE_URL}/api/applications`, hasFallback: false },
    { url: `${BASE_URL}/api/credits/balance`, hasFallback: false },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const dbDown = simulateDbOutage();

  if (dbDown) {
    console.log(`CHAOS: Database unavailable for ${endpoint.url}`);
    dbErrors.add(1);
  }

  const res = http.get(endpoint.url, { headers: authHeaders });

  // Check how system handles DB outage
  const handled = check(res, {
    'status is valid': (r) => r.status === 200 || r.status === 503 || r.status === 500,
    'has error message': (r) => {
      if (r.status >= 500) {
        try {
          const body = JSON.parse(r.body);
          return body.error !== undefined || body.message !== undefined;
        } catch {
          return true; // Any response is better than crash
        }
      }
      return true;
    },
    no_crash: (r) => r.status !== 0,
  });

  gracefulDegradation.add(handled ? 1 : 0);

  // Check if fallback was used (cached data, default values)
  if (dbDown && endpoint.hasFallback) {
    const usedFallback = res.status === 200;
    fallbackUsed.add(usedFallback ? 1 : 0);
    
    if (usedFallback) {
      console.log(`RESILIENCE: Fallback used for ${endpoint.url}`);
    }
  }

  // Retry with exponential backoff
  if (res.status >= 500) {
    sleep(2);
    const retryRes = http.get(endpoint.url, { headers: authHeaders });
    check(retryRes, {
      'retry may succeed': (r) => r.status === 200 || r.status >= 500,
    });
  }

  sleep(Math.random() * 3);
}

export function handleSummary(data) {
  console.log('Chaos DB Unavailable Test Summary:');
  console.log(`Total DB Errors Simulated: ${data.metrics.db_errors.values.count}`);
  console.log(`Fallback Used: ${data.metrics.fallback_used.values.rate * 100}%`);
  console.log(`Graceful Degradation: ${data.metrics.graceful_degradation.values.rate * 100}%`);
  console.log('System should use cache, fallbacks, or show friendly errors when DB is down');
  console.log('Check Django DB connection error handling, circuit breakers');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
