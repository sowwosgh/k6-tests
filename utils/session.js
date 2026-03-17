/**
 * Утилита для получения сессии через setup()
 *
 * Использование в тесте:
 *
 *   import { getSession } from '../../utils/session.js';
 *
 *   export function setup() { return getSession(); }
 *
 *   export default function (data) {
 *     const ah = { 'Content-Type': 'application/json', Cookie: `sessionid=${data.session}` };
 *     ...
 *   }
 *
 * setup() вызывается ОДИН раз перед всеми VU — экономит лимит логинов.
 */

import http from 'k6/http';

const BASE_URL      = __ENV.BASE_URL      || 'https://sowwos.ru';
const TEST_USER     = __ENV.TEST_USER     || '+79001234567';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'test123';

export function getSession() {
  // Если уже есть готовая сессия — не делаем логин (экономим лимит запросов)
  const existing = __ENV.SESSION_COOKIE;
  if (existing) return { session: existing };

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ phone: TEST_USER, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    throw new Error(`Auth failed: ${res.status} — ${res.body.slice(0, 200)}`);
  }

  const setCookie = res.headers['Set-Cookie'] || res.headers['set-cookie'];
  if (setCookie) {
    const match = setCookie.match(/sessionid=([^;]+)/);
    if (match) return { session: match[1] };
  }

  throw new Error('Auth returned 200 but no sessionid cookie');
}
