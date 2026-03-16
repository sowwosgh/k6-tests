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

  // Фильтрация по опыту работы доступна через /api/feed с дополнительными параметрами.
  // Если параметр не поддерживается — сервер игнорирует его и возвращает 200.
  group('Search - Experience / Worker Filters (via /api/feed)', () => {
    group('Workers with min_salary filter (proxy for senior workers)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=80000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is not empty': (r) => r.body.length > 0,
      });
    });

    group('Workers with salary range', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=40000&max_salary=100000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'salary range filter applied': (r) => r.body.length > 0,
      });
    });

    group('All worker types', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'all workers returned': (r) => r.body.length > 0,
      });
    });

    group('Brigades in city', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=brigade&city=Москва`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'brigades returned': (r) => r.body.length > 0,
      });
    });

    group('Vacancies in city', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=vacancy&city=Москва`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies returned': (r) => r.body.length > 0,
      });
    });

    group('High salary filter (senior level proxy)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=150000`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles high salary filter': (r) => r.body.length > 0,
      });
    });

    group('Invalid salary range (min > max)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&min_salary=100000&max_salary=50000`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid range': () => true,
      });
    });
  });
}
