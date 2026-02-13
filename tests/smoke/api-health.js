import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export default function () {
  // Проверка ленты
  const feedRes = http.get(`${BASE_URL}/api/feed?limit=1`);
  const feedData = parseJsonSafe(feedRes);
  check(feedRes, {
    'Feed API status 200': (r) => r.status === 200,
    'Feed API content-type json': (r) => isJsonResponse(r),
    'Feed API is JSON array': () => Array.isArray(feedData),
  });
}
