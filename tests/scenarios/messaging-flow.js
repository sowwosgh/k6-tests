/**
 * Messaging Flow Test
 * - Без авторизации: проверяет что API правильно отклоняет (401)
 * - С авторизацией: SESSION_COOKIE=sessionid=xxx k6 run messaging-flow.js
 *   (Django использует сессии, не Bearer токены)
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
  vus: 3,
  duration: '2m',
};

export default function () {
  const headers = authHeaders();

  // 1. Список диалогов
  const conversationsRes = http.get(`${BASE_URL}/api/conversations`, {
    headers,
    responseCallback: http.expectedStatuses(200, 401),
  });
  const conversationsBody = parseJsonSafe(conversationsRes);

  if (hasAuth) {
    check(conversationsRes, {
      '✅ conversations: статус 200':       (r) => r.status === 200,
      '✅ conversations: JSON ответ':        (r) => isJsonResponse(r),
      '✅ conversations: массив диалогов':   () => Array.isArray(conversationsBody?.conversations),
    });
  } else {
    check(conversationsRes, {
      '✅ conversations: 401 без авторизации': (r) => r.status === 401,
      '✅ conversations: JSON ответ':           (r) => isJsonResponse(r),
    });
  }

  // 2. Создание/отправка сообщения (только с авторизацией)
  if (hasAuth) {
    const payload = JSON.stringify({ user_id: 2, initial_message: 'Тест k6' });
    const startRes = http.post(`${BASE_URL}/api/conversations/start`, payload, { headers });
    const startBody = parseJsonSafe(startRes);
    const conversationId = startBody?.conversation_id ?? null;

    check(startRes, {
      '✅ conversation start: статус 200/400': (r) => [200, 400].includes(r.status),
      '✅ conversation start: JSON ответ':      (r) => isJsonResponse(r),
    });

    if (conversationId) {
      const msgRes = http.post(
        `${BASE_URL}/api/conversations/${conversationId}/messages`,
        JSON.stringify({ text: 'Тест k6 — сообщение' }),
        { headers }
      );
      check(msgRes, {
        '✅ message sent: статус 200/201': (r) => [200, 201].includes(r.status),
        '✅ message sent: JSON ответ':      (r) => isJsonResponse(r),
      });
    }
  }
}
