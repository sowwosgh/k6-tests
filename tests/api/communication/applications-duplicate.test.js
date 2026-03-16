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

  group('Applications - Duplicate Prevention', () => {
    const vacancyId = 3;

    group('Submit First Application', () => {
      const payload = JSON.stringify({
        vacancy_id: vacancyId,
        cover_letter: 'First application to this vacancy',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'first application created': (r) => r.status === 200 || r.status === 201,
        'response has application data': (r) => r.body.length > 0,
      });
    });

    group('Submit Duplicate Application (Same Vacancy)', () => {
      const payload = JSON.stringify({
        vacancy_id: vacancyId,
        cover_letter: 'Duplicate application attempt',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'duplicate rejected': (r) => r.status === 409 || r.status === 400,
        'error message mentions duplicate or already applied': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('already') || body.includes('duplicate') || body.includes('exists');
        },
      });
    });

    group('Apply to Different Vacancy (Should Succeed)', () => {
      const payload = JSON.stringify({
        vacancy_id: vacancyId + 1,
        cover_letter: 'Application to different vacancy',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'application to different vacancy succeeds': (r) => r.status === 200 || r.status === 201,
        'response confirms new application': (r) => r.body.length > 0,
      });
    });

    group('Multiple Applications Check', () => {
      const res = http.get(`${BASE_URL}/api/applications`, {
        headers: authHeaders,
      });

      check(res, {
        'can retrieve multiple applications': (r) => r.status === 200,
        'list contains applications': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length >= 2;
          }
          return (body.results && body.results.length >= 2) || (body.applications && body.applications.length >= 2);
        },
      });
    });
  });
}
