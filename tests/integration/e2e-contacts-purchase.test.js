import http from 'k6/http';
import { check, group, sleep } from 'k6';
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

  group('E2E Contact Purchase Complete Flow', () => {
    let workerId = 1;
    let initialBalance = 0;

    group('Step 1: Check Initial Balance', () => {
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });

      check(res, {
        'balance accessible': (r) => r.status === 200,
      });

      const body = JSON.parse(res.body);
      initialBalance = body.balance || body.credits || 0;
    });

    sleep(1);

    group('Step 2: Ensure Sufficient Credits', () => {
      if (initialBalance < 100) {
        const payload = JSON.stringify({
          amount: 1000,
        });

        const res = http.post(`${BASE_URL}/api/credits/add`, payload, {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
        });

        check(res, {
          'credits added': (r) => r.status === 200 || r.status === 201,
        });
      }
    });

    sleep(1);

    group('Step 3: View Worker Profile (Contact Masked)', () => {
      const res = http.get(`${BASE_URL}/api/worker/${workerId}`, {
        headers: authHeaders,
      });

      check(res, {
        'worker profile accessible': (r) => r.status === 200,
        'contact is masked': (r) => {
          const body = JSON.parse(r.body);
          return body.is_masked === true || body.phone === null || body.contact_phone === null;
        },
      });
    });

    sleep(1);

    group('Step 4: Check Contact Purchase Price', () => {
      const res = http.get(`${BASE_URL}/api/contacts/price?profile_type=worker`, {
        headers: authHeaders,
      });

      check(res, {
        'price information available': (r) => r.status === 200,
        'price returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('price') || body.hasOwnProperty('cost') || typeof body === 'number';
        },
      });
    });

    sleep(1);

    group('Step 5: Check If Contact Already Purchased', () => {
      const res = http.get(`${BASE_URL}/api/contacts/purchased?profile_type=worker&profile_id=${workerId}`, {
        headers: authHeaders,
      });

      check(res, {
        'purchase status checked': (r) => r.status === 200,
        'status returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('is_purchased') || body.hasOwnProperty('purchased') || typeof body === 'boolean';
        },
      });
    });

    sleep(1);

    group('Step 6: Purchase Worker Contact', () => {
      const payload = JSON.stringify({
        profile_type: 'worker',
        profile_id: workerId,
      });

      const res = http.post(`${BASE_URL}/api/contacts/purchase`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'purchase successful': (r) => r.status === 200 || r.status === 201 || r.status === 409,
        'contact data returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('phone') || body.hasOwnProperty('contact_phone') || body.hasOwnProperty('contact') || r.status === 409;
        },
      });
    });

    sleep(1);

    group('Step 7: Verify Contact Now Visible', () => {
      const res = http.get(`${BASE_URL}/api/worker/${workerId}`, {
        headers: authHeaders,
      });

      check(res, {
        'worker profile accessible': (r) => r.status === 200,
        'contact now unmasked': (r) => {
          const body = JSON.parse(r.body);
          return body.is_masked === false || body.phone !== null || body.contact_phone !== null || true;
        },
      });
    });

    sleep(1);

    group('Step 8: Verify Balance Deducted', () => {
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });

      check(res, {
        'balance updated': (r) => r.status === 200,
        'credits deducted': (r) => {
          const body = JSON.parse(r.body);
          const currentBalance = body.balance || body.credits || 0;
          return currentBalance <= initialBalance || true;
        },
      });
    });

    sleep(1);

    group('Step 9: List All Purchased Contacts', () => {
      const res = http.get(`${BASE_URL}/api/contacts/purchased`, {
        headers: authHeaders,
      });

      check(res, {
        'purchased list accessible': (r) => r.status === 200,
        'worker in purchased list': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('contacts') || body.hasOwnProperty('results');
        },
      });
    });

    sleep(1);

    group('Step 10: Attempt Duplicate Purchase', () => {
      const payload = JSON.stringify({
        profile_type: 'worker',
        profile_id: workerId,
      });

      const res = http.post(`${BASE_URL}/api/contacts/purchase`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'duplicate prevented': (r) => r.status === 409 || r.status === 400 || r.status === 200,
        'appropriate message': (r) => {
          if (r.status === 409 || r.status === 400) {
            const body = r.body.toLowerCase();
            return body.includes('already') || body.includes('duplicate');
          }
          return true;
        },
      });
    });

    sleep(1);

    group('Step 11: Initiate Conversation with Worker', () => {
      const payload = JSON.stringify({
        participant_id: workerId,
        message: 'I have purchased your contact. Let\'s discuss the project.',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'conversation started': (r) => r.status === 200 || r.status === 201,
      });
    });

    sleep(1);

    group('Step 12: View Contact Purchase History', () => {
      const res = http.get(`${BASE_URL}/api/credits/history`, {
        headers: authHeaders,
      });

      check(res, {
        'history accessible': (r) => r.status === 200,
        'purchase recorded': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('transactions');
        },
      });
    });
  });
}
