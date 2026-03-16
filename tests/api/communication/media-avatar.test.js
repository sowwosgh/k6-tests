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

  // Simulate a small image file (1x1 PNG)
  const smallPngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imageFile = http.file(Buffer.from(smallPngData, 'base64'), 'avatar.png', 'image/png');

  group('Media Upload - Avatar', () => {
    group('Upload Valid Avatar Image', () => {
      const formData = {
        avatar: imageFile,
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response has URL or path': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('url') || body.hasOwnProperty('path') || body.hasOwnProperty('avatar_url');
        },
        'upload successful': (r) => r.body.length > 0,
      });
    });

    group('Upload Avatar Without File', () => {
      const formData = {
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'status is 400': (r) => r.status === 400,
        'error mentions file required': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('file') || body.includes('required') || body.includes('avatar');
        },
      });
    });

    group('Upload Avatar Without Profile Type', () => {
      const formData = {
        avatar: imageFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200, 201, or 400': (r) => r.status === 200 || r.status === 201 || r.status === 400,
        'handled gracefully': (r) => r.body.length > 0,
      });
    });

    group('Get Current Avatar', () => {
      const res = http.get(`${BASE_URL}/api/media/avatar`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'valid response': (r) => r.body.length > 0,
      });
    });

    group('Delete Avatar', () => {
      const res = http.del(`${BASE_URL}/api/media/avatar`, null, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200, 204, or 404': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      });
    });

    group('Upload Avatar Without Authentication', () => {
      const formData = {
        avatar: imageFile,
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
