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

  group('Conversations - Start New Conversation', () => {
    group('Start Conversation with Valid User', () => {
      const payload = JSON.stringify({
        participant_id: 2,
        message: 'Hello! I would like to discuss the vacancy.',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'response has conversation data': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('id') || body.hasOwnProperty('conversation_id');
        },
        'conversation has participants': (r) => {
          const body = JSON.parse(r.body);
          return JSON.stringify(body).includes('participant');
        },
      });
    });

    group('Start Conversation Without Initial Message', () => {
      const payload = JSON.stringify({
        participant_id: 3,
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'conversation created without message': (r) => r.body.length > 0,
      });
    });

    group('Start Conversation with Missing participant_id', () => {
      const payload = JSON.stringify({
        message: 'Test message',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 400': (r) => r.status === 400,
        'error mentions participant_id': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('participant') || body.includes('required');
        },
      });
    });

    group('Start Conversation with Non-existent User', () => {
      const payload = JSON.stringify({
        participant_id: 999999,
        message: 'Hello',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 404': (r) => r.status === 404,
        'error indicates user not found': (r) => {
          const body = r.body.toLowerCase();
          return body.includes('not found') || body.includes('does not exist');
        },
      });
    });

    group('Start Conversation Without Authentication', () => {
      const payload = JSON.stringify({
        participant_id: 2,
        message: 'Test',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
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
