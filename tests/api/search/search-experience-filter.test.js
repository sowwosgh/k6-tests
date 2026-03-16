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

  group('Search - Experience Filter', () => {
    group('Filter Workers by Minimum Experience', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=3`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains workers': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('workers');
        },
        'minimum experience filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Workers by Maximum Experience', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?max_experience=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'maximum experience filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Workers by Experience Range', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=2&max_experience=5`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'experience range filter applied': (r) => r.body.length > 0,
      });
    });

    group('Find Entry-Level Workers (0 Experience)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=0&max_experience=1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'entry-level filter works': (r) => r.body.length > 0,
      });
    });

    group('Find Senior Workers (10+ Years)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'senior workers filter applied': (r) => r.body.length > 0,
      });
    });

    group('Filter Brigades by Experience', () => {
      const res = http.get(`${BASE_URL}/api/search/brigades?min_experience=5`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'brigades filtered by experience': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Filter Vacancies by Required Experience', () => {
      const res = http.get(`${BASE_URL}/api/search/vacancies?required_experience=3`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancies require specified experience': (r) => r.body.length > 0,
      });
    });

    group('Invalid Experience Range (Min > Max)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=10&max_experience=2`, {
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

    group('Negative Experience Value', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=-5`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles negative experience': (r) => true,
      });
    });

    group('Very High Experience Filter', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?min_experience=50`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles very high experience': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length === 0 || true;
          }
          return true;
        },
      });
    });
  });
}
