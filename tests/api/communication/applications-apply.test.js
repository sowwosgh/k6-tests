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

  group('Applications - Apply for Vacancy', () => {
    group('Valid Application Submission', () => {
      const payload = JSON.stringify({
        vacancy_id: 1,
        cover_letter: 'I am very interested in this position and believe I would be a great fit.',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response has application data': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('id') || body.hasOwnProperty('application_id');
        },
        'application has vacancy_id': (r) => {
          const body = JSON.parse(r.body);
          return JSON.stringify(body).includes('vacancy');
        },
      });
    });

    group('Apply with Minimal Data', () => {
      const payload = JSON.stringify({
        vacancy_id: 2,
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'application created without cover letter': (r) => r.body.length > 0,
      });
    });

    group('Apply with Missing vacancy_id', () => {
      const payload = JSON.stringify({
        cover_letter: 'I want to apply',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 400': (r) => r.status === 400,
        'error message mentions vacancy_id': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('vacancy') || body.includes('required');
        },
      });
    });

    group('Apply to Non-existent Vacancy', () => {
      const payload = JSON.stringify({
        vacancy_id: 999999,
        cover_letter: 'Test application',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 404': (r) => r.status === 404,
        'error message indicates not found': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('not found') || body.includes('does not exist');
        },
      });
    });

    group('Apply Without Authentication', () => {
      const payload = JSON.stringify({
        vacancy_id: 1,
        cover_letter: 'Test',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
