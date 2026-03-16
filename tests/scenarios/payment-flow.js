/**
 * Payment Flow Test
 * - Без авторизации: проверяет публичные endpoints (packages) + что защищённые дают 401
 * - С авторизацией: SESSION_COOKIE=sessionid=xxx k6 run payment-flow.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';
const hasAuth = SESSION_COOKIE.length > 0;

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (hasAuth) h['Cookie'] = SESSION_COOKIE;
  return h;
}

export const options = {
  vus: 2,
  duration: '1m',
  thresholds: {
    // Пакеты публичные — ошибок не должно быть
    'http_req_duration': ['p(95)<2000'],
  },
};

export default function () {
  // 1. Публичный список пакетов — всегда должен работать
  const packagesRes = http.get(`${BASE_URL}/api/payments/packages`);
  const packagesData = parseJsonSafe(packagesRes);

  check(packagesRes, {
    '✅ packages: статус 200':       (r) => r.status === 200,
    '✅ packages: JSON ответ':        (r) => isJsonResponse(r),
    '✅ packages: массив пакетов':    () => Array.isArray(packagesData) && packagesData.length > 0,
  });

  // 2. Создание платежа — требует авторизацию
  const paymentData = JSON.stringify({ package_id: 'basic' });
  const createRes = http.post(`${BASE_URL}/api/payments/create`, paymentData, {
    headers: authHeaders(),
    // Помечаем 401 как ожидаемый статус (не считается ошибкой в http_req_failed)
    responseCallback: http.expectedStatuses(200, 201, 400, 401, 402, 422),
  });
  const createData = parseJsonSafe(createRes);

  if (hasAuth) {
    check(createRes, {
      '✅ payment create: статус 200/400/422': (r) => [200, 201, 400, 422].includes(r.status),
      '✅ payment create: JSON ответ':          (r) => isJsonResponse(r),
    });
  } else {
    check(createRes, {
      '✅ payment create: 401 без авторизации': (r) => r.status === 401,
      '✅ payment create: JSON ответ':           (r) => isJsonResponse(r),
    });
  }
}
