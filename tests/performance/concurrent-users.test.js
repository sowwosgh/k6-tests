import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

// Simulate 100 concurrent users with different profiles
export const options = {
  scenarios: {
    workers: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'workerScenario',
    },
    employers: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'employerScenario',
    },
    browsers: {
      executor: 'constant-vus',
      vus: 40,
      duration: '5m',
      exec: 'browserScenario',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export function workerScenario() {
  const authHeaders = getAuthHeaders();

  group('Worker Actions', () => {
    // View own profile
    http.get(`${BASE_URL}/api/worker/1`, {
      headers: authHeaders,
    });
    sleep(2);

    // Search for vacancies
    http.get(`${BASE_URL}/api/search/vacancies?city=Москва`, {
      headers: authHeaders,
    });
    sleep(3);

    // View vacancy details
    http.get(`${BASE_URL}/api/vacancy/1`, {
      headers: authHeaders,
    });
    sleep(2);

    // Check applications
    http.get(`${BASE_URL}/api/applications`, {
      headers: authHeaders,
    });
    sleep(4);
  });
}

export function employerScenario() {
  const authHeaders = getAuthHeaders();

  group('Employer Actions', () => {
    // View own vacancies
    http.get(`${BASE_URL}/api/vacancy/1`, {
      headers: authHeaders,
    });
    sleep(2);

    // Search workers
    http.get(`${BASE_URL}/api/search/workers?specialization=Строитель`, {
      headers: authHeaders,
    });
    sleep(3);

    // View worker profile
    http.get(`${BASE_URL}/api/worker/1`, {
      headers: authHeaders,
    });
    sleep(2);

    // Check applications
    http.get(`${BASE_URL}/api/applications`, {
      headers: authHeaders,
    });
    sleep(4);
  });
}

export function browserScenario() {
  group('Browser Actions', () => {
    // Browse feed
    http.get(`${BASE_URL}/api/feed`);
    sleep(2);

    // Search
    http.get(`${BASE_URL}/api/search/workers?city=Москва`);
    sleep(3);

    // View profiles
    http.get(`${BASE_URL}/api/worker/1`);
    sleep(1);
    http.get(`${BASE_URL}/api/vacancy/1`);
    sleep(1);
    http.get(`${BASE_URL}/api/order/1`);
    sleep(3);
  });
}

export function handleSummary(data) {
  console.log('Concurrent Users Test Summary:');
  console.log(`Total VUs: 100 (30 workers + 30 employers + 40 browsers)`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
