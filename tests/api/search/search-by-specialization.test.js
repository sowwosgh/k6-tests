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

  group('Search - Filter by Specialization (via /api/feed)', () => {
    group('Workers - Welder', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&specialization=сварщик`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'response not empty': (r) => r.body.length > 0,
      });
    });

    group('Workers - Electrician', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&specialization=электрик`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'electricians returned': (r) => r.body.length > 0,
      });
    });

    group('Brigades by Specialization', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=brigade&specialization=сварщик`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'brigades returned': (r) => r.body.length > 0,
      });
    });

    group('Non-existent Specialization', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&specialization=НесуществующаяСпец999`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'returns valid response': (r) => r.body.length > 0,
      });
    });

    group('Without Specialization Filter', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'all workers returned': (r) => r.body.length > 0,
      });
    });

    group('City + Specialization Combined', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Москва&specialization=электрик`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'combined filters work': (r) => r.body.length > 0,
      });
    });
  });
}
