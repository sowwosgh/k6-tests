import http from 'k6/http';
import { check } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

export let options = {
  vus: 3,
  duration: '2m',
};

export default function () {
  const headers = buildHeaders();

  const startData = JSON.stringify({
    user_id: 2,
    initial_message: 'Hello from k6 test!',
  });

  const startRes = http.post(`${BASE_URL}/api/conversations/start`, startData, { headers });
  const startJson = parseJsonSafe(startRes);

  const conversationId = startJson && startJson.conversation_id ? startJson.conversation_id : null;

  let sendRes = null;
  if (conversationId) {
    const messageData = JSON.stringify({ text: 'Follow-up from k6 test' });
    sendRes = http.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, messageData, { headers });
  }

  const conversationsRes = http.get(`${BASE_URL}/api/conversations`, { headers });
  const conversationsJson = parseJsonSafe(conversationsRes);

  const authExpected = AUTH_TOKEN ? [200] : [401];

  check(startRes, {
    'conversation start status expected': (r) => authExpected.includes(r.status),
    'conversation start json': (r) => isJsonResponse(r),
  });

  if (AUTH_TOKEN) {
    check(sendRes, {
      'message sent': (r) => r && r.status === 200,
      'message send json': (r) => r && isJsonResponse(r),
    });
  } else {
    check(startRes, {
      'message sent skipped without auth': () => sendRes === null,
    });
  }

  check(conversationsRes, {
    'conversations status expected': (r) => authExpected.includes(r.status),
    'conversations json': (r) => isJsonResponse(r),
    'conversations payload valid': () => {
      if (!AUTH_TOKEN) {
        return conversationsJson !== null;
      }
      return conversationsJson !== null && Array.isArray(conversationsJson.conversations);
    },
  });
}