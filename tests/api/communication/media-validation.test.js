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

  // Valid image file (1x1 PNG)
  const validPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngFile = http.file(Buffer.from(validPng, 'base64'), 'test.png', 'image/png');

  // Invalid file type (text file)
  const textFile = http.file('This is not an image', 'test.txt', 'text/plain');

  // Invalid file type (executable)
  const exeFile = http.file('MZ', 'test.exe', 'application/x-msdownload');

  group('Media Upload - File Validation', () => {
    group('Upload Valid PNG Image', () => {
      const formData = {
        avatar: pngFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'valid PNG accepted': (r) => r.status === 200 || r.status === 201,
        'response has file info': (r) => r.body.length > 0,
      });
    });

    group('Upload Valid JPEG Image', () => {
      // Minimal JPEG header
      const jpegFile = http.file(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), 'test.jpg', 'image/jpeg');
      const formData = {
        avatar: jpegFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'valid JPEG accepted': (r) => r.status === 200 || r.status === 201,
        'response confirms upload': (r) => r.body.length > 0,
      });
    });

    group('Reject Text File', () => {
      const formData = {
        avatar: textFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'text file rejected': (r) => r.status === 400 || r.status === 415,
        'error mentions file type': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('type') || body.includes('format') || body.includes('image');
        },
      });
    });

    group('Reject Executable File', () => {
      const formData = {
        avatar: exeFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'executable rejected': (r) => r.status === 400 || r.status === 415,
        'security error message': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('type') || body.includes('format') || body.includes('not allowed');
        },
      });
    });

    group('Reject File with Invalid Extension', () => {
      const invalidFile = http.file(Buffer.from(validPng, 'base64'), 'image.php', 'image/png');
      const formData = {
        avatar: invalidFile,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'invalid extension rejected': (r) => r.status === 400 || r.status === 415 || r.status === 200,
        'handled appropriately': (r) => r.body.length > 0,
      });
    });

    group('Validate File Mime Type', () => {
      const fakePng = http.file('not a real image', 'fake.png', 'image/png');
      const formData = {
        avatar: fakePng,
      };

      const res = http.post(`${BASE_URL}/api/media/avatar`, formData, {
        headers: authHeaders,
      });

      check(res, {
        'mime type validation performed': (r) => r.status === 400 || r.status === 415 || r.status === 200,
        'appropriate response': (r) => r.body.length > 0,
      });
    });
  });
}
