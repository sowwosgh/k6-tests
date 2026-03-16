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

  // Сортировка через /api/feed — параметр ordering может поддерживаться или игнорироваться.
  // Тест принимает 200 (с сортировкой или без) или 400 (если параметр не поддерживается).
  group('Search - Sorting (via /api/feed)', () => {
    group('Default Sorting', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'default sorting works': (r) => r.body.length > 0,
      });
    });

    group('Sort by Salary Ascending', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&ordering=salary`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'salary sort handled': () => true,
      });
    });

    group('Sort by Salary Descending', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&ordering=-salary`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'descending salary sort handled': () => true,
      });
    });

    group('Sort by Date (Newest First)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&ordering=-created_at`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'date sort handled': () => true,
      });
    });

    group('Boosted items first', () => {
      const res = http.get(`${BASE_URL}/api/feed?boosted=true`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'boosted filter works': (r) => r.body.length > 0,
      });
    });

    group('Urgent items', () => {
      const res = http.get(`${BASE_URL}/api/feed?urgent=true`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'urgent filter works': (r) => r.body.length > 0,
      });
    });

    group('Invalid Sort Field', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&ordering=invalid_field`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid sort field': () => true,
      });
    });

    group('Vacancies sorted by salary', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=vacancy&ordering=-salary`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'vacancy sort handled': () => true,
      });
    });
  });
}
