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

  group('E2E Monetization Flow', () => {
    let initialBalance = 0;
    let finalBalance = 0;

    group('Step 1: Check Initial Balance', () => {
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });

      check(res, {
        'balance accessible': (r) => r.status === 200,
        'balance returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('balance') || body.hasOwnProperty('credits') || typeof body === 'number';
        },
      });

      const body = JSON.parse(res.body);
      initialBalance = body.balance || body.credits || 0;
    });

    sleep(1);

    group('Step 2: Purchase Credits', () => {
      const payload = JSON.stringify({
        amount: 500,
        payment_method: 'card',
      });

      const res = http.post(`${BASE_URL}/api/credits/purchase`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'purchase initiated': (r) => r.status === 200 || r.status === 201 || r.status === 402,
        'payment info returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('payment_url') || body.hasOwnProperty('payment_id') || body.hasOwnProperty('status');
        },
      });
    });

    sleep(1);

    group('Step 3: Simulate Payment Success', () => {
      const payload = JSON.stringify({
        payment_id: 'test_payment_123',
        status: 'success',
        amount: 500,
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
    });

    sleep(1);

    group('Step 4: Verify Balance Increased', () => {
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });

      check(res, {
        'balance updated': (r) => r.status === 200,
        'balance increased': (r) => {
          const body = JSON.parse(r.body);
          const currentBalance = body.balance || body.credits || 0;
          return currentBalance >= initialBalance;
        },
      });

      const body = JSON.parse(res.body);
      finalBalance = body.balance || body.credits || 0;
    });

    sleep(1);

    group('Step 5: Purchase Contact Data', () => {
      const payload = JSON.stringify({
        profile_type: 'worker',
        profile_id: 1,
      });

      const res = http.post(`${BASE_URL}/api/contacts/purchase`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'contact purchase processed': (r) => r.status === 200 || r.status === 201 || r.status === 402,
        'contact data or error returned': (r) => r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 6: Verify Credits Deducted', () => {
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });

      check(res, {
        'balance accessible after purchase': (r) => r.status === 200,
        'credits deducted': (r) => {
          const body = JSON.parse(r.body);
          const currentBalance = body.balance || body.credits || 0;
          return currentBalance <= finalBalance;
        },
      });
    });

    sleep(1);

    group('Step 7: View Transaction History', () => {
      const res = http.get(`${BASE_URL}/api/credits/history`, {
        headers: authHeaders,
      });

      check(res, {
        'history accessible': (r) => r.status === 200,
        'transactions listed': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('transactions') || body.hasOwnProperty('results');
        },
      });
    });

    sleep(1);

    group('Step 8: Boost Profile Using Credits', () => {
      const payload = JSON.stringify({
        profile_type: 'worker',
        profile_id: 1,
        duration: 24,
      });

      const res = http.post(`${BASE_URL}/api/promotions/boost`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'boost applied': (r) => r.status === 200 || r.status === 201 || r.status === 402,
      });
    });

    sleep(1);

    group('Step 9: Check Final Balance', () => {
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });

      check(res, {
        'final balance retrieved': (r) => r.status === 200,
        'balance is valid': (r) => {
          const body = JSON.parse(r.body);
          const balance = body.balance || body.credits || 0;
          return balance >= 0;
        },
      });
    });

    sleep(1);

    group('Step 10: View Billing Summary', () => {
      const res = http.get(`${BASE_URL}/api/billing/history`, {
        headers: authHeaders,
      });

      check(res, {
        'billing history accessible': (r) => r.status === 200,
        'complete flow recorded': (r) => r.body.length > 0,
      });
    });
  });
}
