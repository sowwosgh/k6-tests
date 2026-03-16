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

  group('Conversations - Send Message', () => {
    group('Create Conversation for Testing', () => {
      const payload = JSON.stringify({
        participant_id: 2,
        message: 'Initial message',
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

    group('Send Valid Message', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const payload = JSON.stringify({
        message: 'This is a follow-up message in the conversation',
      });

      const res = http.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response has message data': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('id') || body.hasOwnProperty('message_id') || body.hasOwnProperty('message');
        },
        'message content present': (r) => r.body.length > 0,
      });
    });

    group('Send Empty Message', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const payload = JSON.stringify({
        message: '',
      });

      const res = http.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 400': (r) => r.status === 400,
        'error mentions empty or required': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('empty') || body.includes('required') || body.includes('message');
        },
      });
    });

    group('Send Message to Non-existent Conversation', () => {
      const payload = JSON.stringify({
        message: 'Test message',
      });

      const res = http.post(`${BASE_URL}/api/conversations/999999/messages`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 404': (r) => r.status === 404,
      });
    });

    group('Send Message Without Authentication', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const payload = JSON.stringify({
        message: 'Unauthenticated message',
      });

      const res = http.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
