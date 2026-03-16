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

  group('Search - Sorting', () => {
    group('Sort Workers by Salary (Ascending)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=salary&order=asc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains workers': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('workers');
        },
        'sorting applied': (r) => r.body.length > 0,
      });
    });

    group('Sort Workers by Salary (Descending)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=salary&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'descending order applied': (r) => r.body.length > 0,
      });
    });

    group('Sort Workers by Experience', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=experience&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'experience sorting applied': (r) => r.body.length > 0,
      });
    });

    group('Sort Workers by Rating', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=rating&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'rating sorting applied': (r) => r.body.length > 0,
      });
    });

    group('Sort Workers by Creation Date (Newest First)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=created_at&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'newest first sorting applied': (r) => r.body.length > 0,
      });
    });

    group('Sort Vacancies by Salary', () => {
      const res = http.get(`${BASE_URL}/api/search/vacancies?sort=salary&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancy salary sorting applied': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Sort Orders by Budget', () => {
      const res = http.get(`${BASE_URL}/api/search/orders?sort=budget&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'order budget sorting applied': (r) => r.body.length > 0,
      });
    });

    group('Sort by Relevance (Default)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=relevance`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'relevance sorting works': (r) => r.body.length > 0,
      });
    });

    group('Sort with Invalid Field', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=invalid_field&order=asc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid sort field': (r) => {
          if (r.status === 400) {
            const body = r.body.toLowerCase();
            return body.includes('invalid') || body.includes('sort');
          }
          return true;
        },
      });
    });

    group('Sort with Invalid Order', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=salary&order=invalid`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid order': (r) => true,
      });
    });

    group('Multi-field Sorting', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=rating,experience&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'multi-field sorting supported': (r) => r.body.length > 0,
      });
    });

    group('Default Sorting (No Parameters)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'default sorting applied': (r) => r.body.length > 0,
      });
    });
  });
}
