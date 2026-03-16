import http from 'k6/http';
import { check } from 'k6';
import { randomItem } from '../../utils/data-helpers.js';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const SEARCH_QUERIES = ['developer', 'designer', 'manager', 'driver'];
const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export let options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 15 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const query = randomItem(SEARCH_QUERIES);
  const res = http.get(`${BASE_URL}/api/feed?search=${encodeURIComponent(query)}&limit=10`);
  const data = parseJsonSafe(res);

  check(res, {
    'Search status 200': (r) => r.status === 200,
    'Search content-type json': (r) => isJsonResponse(r),
    'Search returns array': () => Array.isArray(data),
  });

  if (res.status !== 200 || !Array.isArray(data)) {
    console.error(
      `[search-load] query=${query} status=${res.status} content-type=${res.headers['Content-Type'] || res.headers['content-type'] || 'unknown'} body=${String(res.body).slice(0, 120)}`
    );
  }
}