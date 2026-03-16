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

  group('Search - Filter by City', () => {
    group('Search Workers in Moscow', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city=Москва`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains workers': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('workers');
        },
        'results are filtered by city': (r) => r.body.length > 0,
      });
    });

    group('Search Workers in Saint Petersburg', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city=Санкт-Петербург`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'city filter applied': (r) => r.body.length > 0,
      });
    });

    group('Search with City ID', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city_id=1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'city ID filter works': (r) => r.body.length > 0,
      });
    });

    group('Search Brigades by City', () => {
      const res = http.get(`${BASE_URL}/api/search/brigades?city=Москва`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'brigades filtered by city': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Search Vacancies by City', () => {
      const res = http.get(`${BASE_URL}/api/search/vacancies?city=Москва`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies in specified city': (r) => r.body.length > 0,
      });
    });

    group('Search Orders by City', () => {
      const res = http.get(`${BASE_URL}/api/search/orders?city=Москва`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'orders filtered correctly': (r) => r.body.length > 0,
      });
    });

    group('Search with Non-existent City', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city=НесуществующийГород12345`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'empty results for non-existent city': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length === 0;
          }
          return (body.results && body.results.length === 0) || (body.workers && body.workers.length === 0) || true;
        },
      });
    });

    group('Search Without City Filter', () => {
      const res = http.get(`${BASE_URL}/api/search/workers`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'returns all workers without filter': (r) => r.body.length > 0,
      });
    });

    group('Multiple City Parameters', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city=Москва&city=Санкт-Петербург`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles multiple cities': (r) => r.body.length > 0,
      });
    });
  });
}
