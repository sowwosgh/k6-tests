import http from 'k6/http';
import { check } from 'k6';

const CARD_TYPES = ['worker', 'company', 'brigade', 'contractor'];
const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

function parseJsonSafe(response) {
  const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

export default function () {
  CARD_TYPES.forEach(type => {
    const res = http.get(`${BASE_URL}/api/feed?type=${type}&limit=5`);
    const data = parseJsonSafe(res);

    check(res, {
      [`${type} cards status 200`]: (r) => r.status === 200,
      [`${type} cards content-type json`]: (r) => {
        const contentType = r.headers['Content-Type'] || r.headers['content-type'] || '';
        return contentType.includes('application/json');
      },
      [`${type} cards is array`]: () => Array.isArray(data),
    });

    if (res.status !== 200 || !Array.isArray(data)) {
      console.error(
        `[cards-smoke] type=${type} status=${res.status} content-type=${res.headers['Content-Type'] || res.headers['content-type'] || 'unknown'} body=${String(res.body).slice(0, 120)}`
      );
    }
  });
}