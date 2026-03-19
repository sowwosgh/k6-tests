/**
 * Центральный конфиг k6-тестов
 * Использование: BASE_URL=https://sowwos.ru k6 run test.js
 * По умолчанию: https://sowwos.ru (продакшн)
 */

export const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const DEFAULT_TIMEOUT = '10s';

export function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (__ENV.AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }
  if (__ENV.SESSION_COOKIE) {
    const c = __ENV.SESSION_COOKIE;
    headers['Cookie'] = c.includes('=') ? c : `sessionid=${c}`;
  }
  return headers;
}

export function getSessionHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (__ENV.SESSION_COOKIE) {
    const c = __ENV.SESSION_COOKIE;
    headers['Cookie'] = c.includes('=') ? c : `sessionid=${c}`;
  }
  return headers;
}
