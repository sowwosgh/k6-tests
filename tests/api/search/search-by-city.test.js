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

  group('Search - Filter by City (via /api/feed)', () => {
    group('Workers in Moscow', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Москва`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is not empty': (r) => r.body.length > 0,
      });
    });

    group('Workers in Saint Petersburg', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Санкт-Петербург`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'city filter applied': (r) => r.body.length > 0,
      });
    });

    group('Brigades by City', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=brigade&city=Москва`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'brigades returned': (r) => r.body.length > 0,
      });
    });

    group('Vacancies by City', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=vacancy&city=Москва`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies returned': (r) => r.body.length > 0,
      });
    });

    group('Orders by City', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=order&city=Москва`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'orders returned': (r) => r.body.length > 0,
      });
    });

    group('Non-existent City', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=НесуществующийГород12345`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'returns valid response': (r) => r.body.length > 0,
      });
    });

    group('Without City Filter', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'returns workers without city filter': (r) => r.body.length > 0,
      });
    });

    group('Combined City + Type Filter', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Москва&page=1&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'combined filter works': (r) => r.body.length > 0,
      });
    });
  });
}
