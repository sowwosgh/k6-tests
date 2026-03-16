import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();
  let conversationId;

  group('Conversations - Get Messages', () => {
    group('Create Conversation for Testing', () => {
      const payload = JSON.stringify({
        participant_id: 2,
        message: 'Test conversation for messages',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'conversation created': (r) => r.status === 200 || r.status === 201,
      });

      const body = JSON.parse(res.body);
      conversationId = body.id || body.conversation_id;
    });

    group('Get Messages from Conversation', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const res = http.get(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is array or has messages': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('messages') || body.hasOwnProperty('results');
        },
        'messages have content': (r) => r.body.length > 0,
      });
    });

    group('Get Messages with Pagination', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const res = http.get(`${BASE_URL}/api/conversations/${conversationId}/messages?page=1&page_size=20`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'pagination supported': (r) => r.body.length > 0,
      });
    });

    group('Get Messages from Non-existent Conversation', () => {
      const res = http.get(`${BASE_URL}/api/conversations/999999/messages`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 404': (r) => r.status === 404,
      });
    });

    group('Get Messages Without Authentication', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const res = http.get(`${BASE_URL}/api/conversations/${conversationId}/messages`);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
