import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export let options = {
  vus: 2,
  duration: '1m',
};

export default function () {
  const uniqueSuffix = `${Date.now()}${__VU}${__ITER}`.slice(-10);
  const payload = JSON.stringify({
    phone: `+79${uniqueSuffix}`,
    password: 'Test123!'
  });
  
  const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const data = parseJsonSafe(res);

  check(res, {
    'registration success': (r) => r.status === 200,
    'registration content-type json': (r) => isJsonResponse(r),
    'user created': () => data !== null && data.user_id !== undefined,
  });

  if (res.status !== 200 || data === null) {
    console.error(
      `[registration-flow] status=${res.status} content-type=${res.headers['Content-Type'] || res.headers['content-type'] || 'unknown'} body=${String(res.body).slice(0, 120)}`
    );
  }
}