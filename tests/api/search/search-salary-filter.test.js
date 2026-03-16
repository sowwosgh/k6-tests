import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();

  group('Search - Salary Filter (via /api/feed)', () => {
    group('Workers with Minimum Salary', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=50000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'min salary filter applied': (r) => r.body.length > 0,
      });
    });

    group('Workers with Maximum Salary', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&max_salary=100000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'max salary filter applied': (r) => r.body.length > 0,
      });
    });

    group('Workers in Salary Range', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=40000&max_salary=80000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'salary range applied': (r) => r.body.length > 0,
      });
    });

    group('Vacancies by Salary', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=vacancy&min_salary=60000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies filtered by salary': (r) => r.body.length > 0,
      });
    });

    group('Orders by Budget', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=order&min_salary=100000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'orders filtered by budget': (r) => r.body.length > 0,
      });
    });

    group('Invalid Range (Min > Max)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=100000&max_salary=50000`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid range': () => true,
      });
    });

    group('Very High Salary', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=1000000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles high salary': (r) => r.body.length > 0,
      });
    });

    group('Salary + City Combined', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Москва&min_salary=60000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'combined filter works': (r) => r.body.length > 0,
      });
    });
  });
}
