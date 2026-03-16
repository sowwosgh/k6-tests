import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export let options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  const res = http.get(`${BASE_URL}/api/feed?type=worker&limit=5`);
  const data = parseJsonSafe(res);

  check(res, {
    'Feed filter status 200': (r) => r.status === 200,
    'Feed filter content-type json': (r) => isJsonResponse(r),
    'Feed filter returns array': () => Array.isArray(data),
  });

  if (res.status !== 200 || !Array.isArray(data)) {
    console.error(
      `[filters-smoke] status=${res.status} content-type=${res.headers['Content-Type'] || res.headers['content-type'] || 'unknown'} body=${String(res.body).slice(0, 120)}`
    );
  }
}