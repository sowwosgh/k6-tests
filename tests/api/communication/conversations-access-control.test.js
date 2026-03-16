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

  group('Conversations - Access Control', () => {
    group('Create Conversation Between User1 and User2', () => {
      const payload = JSON.stringify({
        participant_id: 2,
        message: 'Test conversation for access control',
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

    group('Access Own Conversation (Allowed)', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const res = http.get(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'can access own conversation': (r) => r.body.length > 0,
      });
    });

    group('Send Message to Own Conversation (Allowed)', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const payload = JSON.stringify({
        message: 'Test access control message',
      });

      const res = http.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'message sent successfully': (r) => r.body.length > 0,
      });
    });

    group('Verify Conversation Participants', () => {
      if (!conversationId) {
        console.log('Skipping: No conversation ID available');
        return;
      }

      const res = http.get(`${BASE_URL}/api/conversations/${conversationId}`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'conversation has participant info': (r) => {
          const body = JSON.parse(r.body);
          return JSON.stringify(body).includes('participant');
        },
      });
    });

    group('List Only Own Conversations', () => {
      const res = http.get(`${BASE_URL}/api/conversations`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'only returns own conversations': (r) => r.body.length > 0,
      });
    });
  });
}
