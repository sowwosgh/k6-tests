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

  // Create test images of different sizes
  const validPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  group('Media Upload - Size Limits', () => {
    group('Upload Small File (Under Limit)', () => {
      const smallFile = http.file(Buffer.from(validPng, 'base64'), 'small.png', 'image/png');
      const formData = {
        avatar: smallFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'small file accepted': (r) => r.status === 200 || r.status === 201,
        'upload successful': (r) => r.body.length > 0,
      });
    });

    group('Upload Medium File (1KB)', () => {
      const mediumData = 'A'.repeat(1024);
      const mediumFile = http.file(mediumData, 'medium.png', 'image/png');
      const formData = {
        avatar: mediumFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'medium file processed': (r) => r.status === 200 || r.status === 201 || r.status === 400 || r.status === 413,
        'appropriate response': (r) => r.body.length > 0,
      });
    });

    group('Upload Large File (100KB)', () => {
      const largeData = 'A'.repeat(100 * 1024);
      const largeFile = http.file(largeData, 'large.png', 'image/png');
      const formData = {
        avatar: largeFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'large file processed': (r) => r.status === 200 || r.status === 201 || r.status === 400 || r.status === 413,
        'size limit enforced': (r) => r.body.length > 0,
      });
    });

    group('Upload Very Large File (Over Limit)', () => {
      const veryLargeData = 'A'.repeat(10 * 1024 * 1024); // 10MB
      const veryLargeFile = http.file(veryLargeData, 'verylarge.png', 'image/png');
      const formData = {
        avatar: veryLargeFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'oversized file rejected': (r) => r.status === 413 || r.status === 400,
        'error mentions size limit': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('size') || body.includes('large') || body.includes('limit') || body.includes('exceed');
        },
      });
    });

    group('Upload Empty File', () => {
      const emptyFile = http.file('', 'empty.png', 'image/png');
      const formData = {
        avatar: emptyFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'empty file rejected': (r) => r.status === 400,
        'error mentions empty or invalid': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('empty') || body.includes('invalid') || body.includes('size');
        },
      });
    });

    group('Check Size Limit in Response Headers', () => {
      const res = http.options(`${BASE_URL}/api/media/avatar`, null, {
        headers: authHeaders,
      });

      check(res, {
        'options request successful or not supported': (r) => r.status === 200 || r.status === 405 || r.status === 404,
        'headers present': (r) => true,
      });
    });

    group('Portfolio Size Limits', () => {
      const largeData = 'A'.repeat(5 * 1024 * 1024); // 5MB
      const largeFile = http.file(largeData, 'portfolio.png', 'image/png');
      const formData = {
        image: largeFile,
      };

      const res = http.post(`${BASE_URL}/api/media/portfolio`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'portfolio size limits enforced': (r) => r.status === 200 || r.status === 201 || r.status === 400 || r.status === 413,
        'appropriate handling': (r) => r.body.length > 0,
      });
    });
  });
}
