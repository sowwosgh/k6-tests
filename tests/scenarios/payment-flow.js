import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export let options = {
  vus: 2,
  duration: '1m',
};

export default function () {
  const packagesRes = http.get(`${BASE_URL}/api/payments/packages`);
  const packagesData = parseJsonSafe(packagesRes);

  check(packagesRes, {
    'packages status 200': (r) => r.status === 200,
    'packages content-type json': (r) => isJsonResponse(r),
    'packages is array': () => Array.isArray(packagesData),
  });

  const paymentData = JSON.stringify({ package_id: 1 });
  const createRes = http.post(`${BASE_URL}/api/payments/create`, paymentData, {
    headers: { 'Content-Type': 'application/json' },
  });
  const createData = parseJsonSafe(createRes);

  check(createRes, {
    'payment create status expected': (r) => [200, 400, 401, 422].includes(r.status),
    'payment create content-type json': (r) => isJsonResponse(r),
    'payment create has payload': () => createData !== null,
  });

  if (packagesRes.status !== 200 || !Array.isArray(packagesData)) {
    console.error(
      `[payment-flow:packages] status=${packagesRes.status} content-type=${packagesRes.headers['Content-Type'] || packagesRes.headers['content-type'] || 'unknown'} body=${String(packagesRes.body).slice(0, 120)}`
    );
  }

  if (![200, 400, 401, 422].includes(createRes.status) || createData === null) {
    console.error(
      `[payment-flow:create] status=${createRes.status} content-type=${createRes.headers['Content-Type'] || createRes.headers['content-type'] || 'unknown'} body=${String(createRes.body).slice(0, 120)}`
    );
  }
}