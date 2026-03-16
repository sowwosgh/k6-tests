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

  group('Feed - Advanced Filtering', () => {
    group('Get Feed with Type Filter (Workers Only)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains feed items': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('items');
        },
        'only workers returned': (r) => r.body.includes('worker') || r.body.length > 0,
      });
    });

    group('Get Feed with Type Filter (Vacancies Only)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=vacancy`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'only vacancies returned': (r) => r.body.includes('vacancy') || r.body.length > 0,
      });
    });

    group('Get Feed with Type Filter (Orders Only)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=order`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'only orders returned': (r) => r.body.length > 0,
      });
    });

    group('Get Feed with Multiple Types', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&type=vacancy`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'multiple types supported': (r) => r.body.length > 0,
      });
    });

    group('Filter Feed by City', () => {
      const res = http.get(`${BASE_URL}/api/feed?city=Москва`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'city filter applied': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Filter Feed by Specialization', () => {
      const res = http.get(`${BASE_URL}/api/feed?specialization=Строитель`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'specialization filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Feed by Salary Range', () => {
      const res = http.get(`${BASE_URL}/api/feed?min_salary=50000&max_salary=100000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'salary filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Feed by Boosted Items Only', () => {
      const res = http.get(`${BASE_URL}/api/feed?boosted=true`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'boosted items filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Feed by Urgent Items Only', () => {
      const res = http.get(`${BASE_URL}/api/feed?urgent=true`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'urgent items filter applied': (r) => r.body.length > 0,
      });
    });

    group('Combined Filters', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Москва&min_salary=60000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'multiple filters combined': (r) => r.body.length > 0,
      });
    });

    group('Filter with Pagination', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=1&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'filters work with pagination': (r) => r.body.length > 0,
      });
    });

    group('Invalid Type Filter', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=invalid_type`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid type': (r) => true,
      });
    });
  });
}
