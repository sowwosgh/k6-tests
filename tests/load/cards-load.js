import http from 'k6/http';
import { check } from 'k6';
import { randomItem } from '../../utils/data-helpers.js';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const CARD_TYPES = ['worker', 'company', 'brigade', 'contractor'];
const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  const type = randomItem(CARD_TYPES);
  const res = http.get(`${BASE_URL}/api/feed?type=${type}&limit=10`);
  const data = parseJsonSafe(res);

  check(res, {
    [`${type} cards status`]: (r) => r.status === 200,
    [`${type} cards content-type json`]: (r) => isJsonResponse(r),
    'Response is array': () => Array.isArray(data),
  });

  if (res.status !== 200 || !Array.isArray(data)) {
    console.error(
      `[cards-load] type=${type} status=${res.status} content-type=${res.headers['Content-Type'] || res.headers['content-type'] || 'unknown'} body=${String(res.body).slice(0, 120)}`
    );
  }
}