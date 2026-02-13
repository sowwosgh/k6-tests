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

  const conversationStartPayload = JSON.stringify({
    user_id: 2,
    initial_message: 'Hello from k6 test!',
  });

  const startResponse = http.post(`${BASE_URL}/api/conversations/start`, conversationStartPayload, { headers });
  const startResponseBody = parseJsonSafe(startResponse);

  const conversationId = startResponseBody?.conversation_id ?? null;

  let sendMessageResponse = null;
  if (conversationId) {
    const sendMessagePayload = JSON.stringify({ text: 'Follow-up from k6 test' });
    sendMessageResponse = http.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, sendMessagePayload, { headers });
  }

  const conversationsResponse = http.get(`${BASE_URL}/api/conversations`, { headers });
  const conversationsResponseBody = parseJsonSafe(conversationsResponse);

  const expectedStatuses = AUTH_TOKEN ? [200] : [401];

  check(startResponse, {
    'conversation start status expected': (r) => expectedStatuses.includes(r.status),
    'conversation start json': (r) => isJsonResponse(r),
  });

  if (AUTH_TOKEN) {
    check(sendMessageResponse, {
      'message sent': (r) => r && r.status === 200,
      'message send json': (r) => r && isJsonResponse(r),
    });
  } else {
    check(startResponse, {
      'message sent skipped without auth': () => sendMessageResponse === null,
    });
  }

  check(conversationsResponse, {
    'conversations status expected': (r) => expectedStatuses.includes(r.status),
    'conversations json': (r) => isJsonResponse(r),
    'conversations payload valid': () => {
      if (!AUTH_TOKEN) {
        return conversationsResponseBody !== null;
      }
      return conversationsResponseBody !== null && Array.isArray(conversationsResponseBody.conversations);
    },
  });
}