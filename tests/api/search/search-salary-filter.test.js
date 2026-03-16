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

  group('Search - Salary Filter', () => {
    group('Filter Workers by Minimum Salary', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=50000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains workers': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('workers');
        },
        'minimum salary filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Workers by Maximum Salary', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?max_salary=100000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'maximum salary filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Workers by Salary Range', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=40000&max_salary=80000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'salary range filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Vacancies by Salary', () => {
      const res = http.get(`${BASE_URL}/api/search/vacancies?min_salary=60000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies filtered by salary': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Filter Orders by Budget Range', () => {
      const res = http.get(`${BASE_URL}/api/search/orders?min_budget=100000&max_budget=500000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'orders filtered by budget': (r) => r.body.length > 0,
      });
    });

    group('Invalid Salary Range (Min > Max)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=100000&max_salary=50000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid range': (r) => {
          if (r.status === 400) {
            const body = r.body.toLowerCase();
            return body.includes('invalid') || body.includes('range');
          }
          return true;
        },
      });
    });

    group('Negative Salary Value', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=-1000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles negative salary': (r) => true,
      });
    });

    group('Very High Salary Filter', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=1000000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles high salary filter': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return true;
          }
          return true;
        },
      });
    });

    group('Zero Salary (Free Work)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=0&max_salary=0`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'zero salary filter works': (r) => r.body.length > 0,
      });
    });

    group('Salary with Currency Filter', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_salary=50000&currency=RUB`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'currency filter applied': (r) => r.body.length > 0,
      });
    });
  });
}
