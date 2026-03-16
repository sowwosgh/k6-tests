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
  const imageFile = http.file(Buffer.from(smallPngData, 'base64'), 'portfolio1.png', 'image/png');

  group('Media Upload - Portfolio', () => {
    group('Upload Single Portfolio Image', () => {
      const formData = {
        image: imageFile,
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/portfolio`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response has image data': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('url') || body.hasOwnProperty('path') || body.hasOwnProperty('id');
        },
        'upload successful': (r) => r.body.length > 0,
      });
    });

    group('Upload Multiple Portfolio Images', () => {
      const imageFile2 = http.file(Buffer.from(smallPngData, 'base64'), 'portfolio2.png', 'image/png');
      const formData = {
        images: [imageFile, imageFile2],
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/portfolio/batch`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200, 201, or 404': (r) => r.status === 200 || r.status === 201 || r.status === 404,
        'valid response': (r) => r.body.length > 0,
      });
    });

    group('Get Portfolio Images', () => {
      const res = http.get(`${BASE_URL}/api/media/portfolio`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is array or has images': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('images') || body.hasOwnProperty('portfolio');
        },
      });
    });

    group('Delete Portfolio Image', () => {
      const res = http.del(`${BASE_URL}/api/media/portfolio/1`, null, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200, 204, or 404': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      });
    });

    group('Upload Portfolio Without File', () => {
      const formData = {
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/portfolio`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'status is 400': (r) => r.status === 400,
        'error mentions file required': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('file') || body.includes('required') || body.includes('image');
        },
      });
    });

    group('Upload Portfolio Without Authentication', () => {
      const formData = {
        image: imageFile,
        profile_type: 'worker',
      };

      const res = http.post(`${BASE_URL}/api/media/portfolio`, formData);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
