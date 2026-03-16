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

  group('Applications - Update Status', () => {
    let applicationId;

    group('Create Application for Status Update Test', () => {
      const payload = JSON.stringify({
        vacancy_id: 1,
        cover_letter: 'Test application for status update',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'application created': (r) => r.status === 200 || r.status === 201,
      });

      const body = JSON.parse(res.body);
      applicationId = body.id || body.application_id;
    });

    group('Update Application Status (Self)', () => {
      if (!applicationId) {
        console.log('Skipping: No application ID available');
        return;
      }

      const payload = JSON.stringify({
        status: 'withdrawn',
      });

      const res = http.patch(`${BASE_URL}/api/applications/${applicationId}`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200': (r) => r.status === 200 || r.status === 204,
        'status updated successfully': (r) => {
          if (r.status === 204) return true;
          const body = JSON.parse(r.body);
          return JSON.stringify(body).includes('withdrawn') || body.status === 'withdrawn';
        },
      });
    });

    group('Update Status with Invalid Value', () => {
      if (!applicationId) {
        console.log('Skipping: No application ID available');
        return;
      }

      const payload = JSON.stringify({
        status: 'invalid_status_value',
      });

      const res = http.patch(`${BASE_URL}/api/applications/${applicationId}`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 400': (r) => r.status === 400,
        'error message mentions invalid status': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('invalid') || body.includes('status');
        },
      });
    });

    group('Update Non-existent Application', () => {
      const payload = JSON.stringify({
        status: 'withdrawn',
      });

      const res = http.patch(`${BASE_URL}/api/applications/999999`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 404': (r) => r.status === 404,
      });
    });

    group('Update Without Authentication', () => {
      if (!applicationId) {
        console.log('Skipping: No application ID available');
        return;
      }

      const payload = JSON.stringify({
        status: 'withdrawn',
      });

      const res = http.patch(`${BASE_URL}/api/applications/${applicationId}`, payload, {
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
