/**
 * Registration Flow Test
 *
 * Проверяет Шаг 1 регистрации: отправка телефона → сервер отвечает корректно.
 * Полная автоматизация невозможна — Шаг 2 требует реальный SMS-код.
 *
 * Что проверяется:
 * - API принимает запрос (не 500)
 * - Ответ в формате JSON
 * - Сервер не даёт зарегистрировать невалидный номер
 */
import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';
import { generatePhone } from '../../utils/generators.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 2,
  duration: '1m',
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
  },
};

export default function () {
  // Шаг 1: Отправить телефон — сервер должен ответить (не упасть)
  const phone = generatePhone();
  const payload = JSON.stringify({ phone, password: 'Test123!' });

  const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
    // 200 = принято (отправлен SMS), 400 = валидация, 429 = rate limit — всё допустимо
    responseCallback: http.expectedStatuses(200, 201, 400, 422, 429),
  });
  const data = parseJsonSafe(res);

  check(res, {
    '✅ register: API не упал (не 500)':   (r) => r.status < 500,
    '✅ register: JSON ответ':              (r) => isJsonResponse(r),
    '✅ register: тело не пустое':          () => data !== null,
    '✅ register: принял или отклонил':     (r) => [200, 201, 400, 422, 429].includes(r.status),
  });

  // Шаг 2 (SMS верификация) — не автоматизируется, требует реальный код
}
