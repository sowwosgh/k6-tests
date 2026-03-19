import http from 'k6/http';
import { check, group } from 'k6';
import encoding from 'k6/encoding';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

// Для multipart загрузок — только cookie, без Content-Type
function getUploadHeaders() {
  const h = {};
  if (__ENV.SESSION_COOKIE) {
    const c = __ENV.SESSION_COOKIE;
    h['Cookie'] = c.includes('=') ? c : `sessionid=${c}`;
  }
  if (__ENV.AUTH_TOKEN) {
    h['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }
  return h;
}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

// 1x1 PNG
const SMALL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export default function () {
  const authHeaders = getAuthHeaders();

  // --- 1. Создать резюме, получить id ---
  let resumeId = null;
  group('Resume Photo - Setup: create resume', () => {
    const res = http.post(
      `${BASE_URL}/api/resume`,
      JSON.stringify({
        full_name: 'Тест Фото',
        desired_position: 'Тестировщик',
        city: 'Москва',
        phone: '79001234567',
        is_published: true,
      }),
      { headers: authHeaders }
    );
    check(res, { 'resume created (200/201)': (r) => r.status === 200 || r.status === 201 });
    if (res.status === 200 || res.status === 201) {
      try { resumeId = JSON.parse(res.body).id; } catch (_) {}
    }
  });

  if (!resumeId) {
    console.error('Не удалось создать резюме — пропускаем тест фото');
    return;
  }

  // --- 2. Загрузить фото ---
  group('Resume Photo - Upload', () => {
    const imageFile = http.file(encoding.b64decode(SMALL_PNG, 'std', 'b'), 'photo.png', 'image/png');
    const res = http.post(
      `${BASE_URL}/api/resume/${resumeId}/photo`,
      { file: imageFile },
      { headers: getUploadHeaders() }  // без Content-Type — k6 сам ставит multipart
    );
    check(res, {
      'upload status 200': (r) => r.status === 200,
      'response ok=true': (r) => {
        try { return JSON.parse(r.body).ok === true; } catch (_) { return false; }
      },
      'response has url': (r) => {
        try { return typeof JSON.parse(r.body).url === 'string'; } catch (_) { return false; }
      },
    });
  });

  // --- 3. Проверить что фото появилось в GET /api/resume/:id ---
  group('Resume Photo - Visible in resume detail', () => {
    const res = http.get(`${BASE_URL}/api/resume/${resumeId}`, { headers: authHeaders });
    check(res, {
      'resume detail 200': (r) => r.status === 200,
      'resume has photo field': (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.hasOwnProperty('photo') || b.hasOwnProperty('photo_url');
        } catch (_) { return false; }
      },
    });
  });

  // --- 4. Загрузить без авторизации → 401 ---
  group('Resume Photo - Unauthorized upload rejected', () => {
    const imageFile = http.file(encoding.b64decode(SMALL_PNG, 'std', 'b'), 'photo.png', 'image/png');
    const res = http.post(`${BASE_URL}/api/resume/${resumeId}/photo`, { file: imageFile });
    check(res, { 'unauthenticated → 401': (r) => r.status === 401 || r.status === 403 });
  });

  // --- 5. Удалить резюме (cleanup) ---
  group('Resume Photo - Cleanup', () => {
    const res = http.del(`${BASE_URL}/api/resume/${resumeId}`, null, { headers: authHeaders });
    check(res, { 'cleanup deleted (200/204)': (r) => r.status === 200 || r.status === 204 });
  });
}
