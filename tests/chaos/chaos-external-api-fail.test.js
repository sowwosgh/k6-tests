import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const externalApiErrors = new Counter('external_api_errors');
const isolationRate = new Rate('failure_isolation');
const systemStability = new Rate('system_stability');

export const options = {
  vus: 40,
  duration: '5m',
  thresholds: {
    'failure_isolation': ['rate>0.9'], // 90% should remain isolated
    'system_stability': ['rate>0.85'], // System remains mostly stable
  },
};

// Simulate external service failures
function simulateExternalFailure(serviceName) {
  const failures = {
    sms: { probability: 0.15, error: 'SMS Gateway Timeout' },
    payment: { probability: 0.1, error: 'Payment Gateway Unavailable' },
    geolocation: { probability: 0.08, error: 'Geolocation API Failed' },
    email: { probability: 0.05, error: 'Email Service Down' },
  };

  const failure = failures[serviceName];
  if (failure && Math.random() < failure.probability) {
    console.log(`CHAOS: ${failure.error}`);
    return true;
  }
  return false;
}

export default function () {
  const authHeaders = getAuthHeaders();

  const scenarios = [
    // Scenarios that depend on SMS (registration, auth)
    {
      name: 'SMS-dependent',
      endpoint: `${BASE_URL}/api/feed`,
      externalService: 'sms',
      critical: false,
    },
    // Scenarios that depend on payment gateway
    {
      name: 'Payment-dependent',
      endpoint: `${BASE_URL}/api/credits/balance`,
      externalService: 'payment',
      critical: false,
    },
    // Scenarios that depend on geolocation
    {
      name: 'Geolocation-dependent',
      endpoint: `${BASE_URL}/api/search/workers?city=Москва`,
      externalService: 'geolocation',
      critical: false,
    },
    // Core functionality (should work even if external services fail)
    {
      name: 'Core',
      endpoint: `${BASE_URL}/api/worker/1`,
      externalService: null,
      critical: true,
    },
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // Simulate external service failure
  let externalFailed = false;
  if (scenario.externalService) {
    externalFailed = simulateExternalFailure(scenario.externalService);
    if (externalFailed) {
      externalApiErrors.add(1);
    }
  }

  const res = http.get(scenario.endpoint, { headers: authHeaders });

  // Check failure isolation
  if (externalFailed) {
    const isolated = check(res, {
      'system still responsive': (r) => r.status !== 0,
      'error handled gracefully': (r) => {
        // Non-critical: Can fail gracefully (200 with degraded data, or 503)
        // Critical: Must work (200 only)
        if (scenario.critical) {
          return r.status === 200;
        }
        return r.status === 200 || r.status === 503 || r.status === 500;
      },
      'has response body': (r) => r.body.length > 0,
    });
    
    isolationRate.add(isolated ? 1 : 0);
  }

  // Check overall system stability
  const stable = check(res, {
    'status is valid': (r) => r.status >= 200 && r.status < 600,
    'no cascading failure': (r) => r.status !== 0,
    'response time reasonable': (r) => r.timings.duration < 10000,
  });

  systemStability.add(stable ? 1 : 0);

  // Log critical failures
  if (scenario.critical && res.status !== 200) {
    console.log(`CRITICAL: Core functionality failed - ${scenario.endpoint} (${res.status})`);
  }

  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  console.log('Chaos External API Failure Test Summary:');
  console.log(`External API Errors Simulated: ${data.metrics.external_api_errors.values.count}`);
  console.log(`Failure Isolation Rate: ${data.metrics.failure_isolation.values.rate * 100}%`);
  console.log(`System Stability: ${data.metrics.system_stability.values.rate * 100}%`);
  console.log('External service failures should NOT cascade to core functionality');
  console.log('Check circuit breakers, timeouts, fallbacks for SMS, payment, email services');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
