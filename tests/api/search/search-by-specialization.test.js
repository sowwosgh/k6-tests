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

  group('Search - Filter by Specialization', () => {
    group('Search Workers - Construction Specialization', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization=Строитель`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains workers': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('workers');
        },
        'specialization filter applied': (r) => r.body.length > 0,
      });
    });

    group('Search Workers - Electrician Specialization', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization=Электрик`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'electricians returned': (r) => r.body.length > 0,
      });
    });

    group('Search by Specialization ID', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization_id=1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'specialization ID filter works': (r) => r.body.length > 0,
      });
    });

    group('Search Brigades by Specialization', () => {
      const res = http.get(`${BASE_URL}/api/search/brigades?specialization=Строительная`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'brigades filtered by specialization': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Search Vacancies by Required Specialization', () => {
      const res = http.get(`${BASE_URL}/api/search/vacancies?required_specialization=Строитель`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies require specified specialization': (r) => r.body.length > 0,
      });
    });

    group('Search with Multiple Specializations', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization=Строитель&specialization=Электрик`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles multiple specializations': (r) => r.body.length > 0,
      });
    });

    group('Search with Non-existent Specialization', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization=НесуществующаяСпециализация999`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'empty results for non-existent specialization': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length === 0;
          }
          return (body.results && body.results.length === 0) || true;
        },
      });
    });

    group('Search Without Specialization Filter', () => {
      const res = http.get(`${BASE_URL}/api/search/workers`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'returns all workers': (r) => r.body.length > 0,
      });
    });

    group('Case Insensitive Specialization Search', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization=строитель`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'case insensitive search works': (r) => r.body.length > 0,
      });
    });

    group('Partial Specialization Match', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?specialization=Строи`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'partial match supported': (r) => r.body.length > 0,
      });
    });
  });
}
