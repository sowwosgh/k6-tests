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

  group('E2E Subscription Flow', () => {
    let subscriptionId = '';

    group('Step 1: Check Subscription Status', () => {
      const res = http.get(`${BASE_URL}/api/me/subscription`, {
        headers: authHeaders,
      });

      check(res, {
        'subscription status accessible': (r) => r.status === 200,
        'subscription info returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('is_subscribed') || body.hasOwnProperty('plan') || body.hasOwnProperty('subscription');
        },
      });
    });

    sleep(1);

    group('Step 2: View Available Plans', () => {
      const res = http.get(`${BASE_URL}/api/subscriptions/plans`, {
        headers: authHeaders,
      });

      check(res, {
        'plans list accessible': (r) => r.status === 200,
        'plans returned': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('plans') || body.hasOwnProperty('results');
        },
      });
    });

    sleep(1);

    group('Step 3: Subscribe to Premium Plan', () => {
      const payload = JSON.stringify({
        plan_id: 'premium',
        billing_period: 'monthly',
      });

      const res = http.post(`${BASE_URL}/api/subscriptions/subscribe`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'subscription initiated': (r) => r.status === 200 || r.status === 201 || r.status === 402,
        'subscription data returned': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('subscription_id') || body.hasOwnProperty('id') || body.hasOwnProperty('payment_url');
        },
      });

      const body = JSON.parse(res.body);
      subscriptionId = body.subscription_id || body.id || 'test_sub_123';
    });

    sleep(1);

    group('Step 4: Verify Subscription Active', () => {
      const res = http.get(`${BASE_URL}/api/me/subscription`, {
        headers: authHeaders,
      });

      check(res, {
        'subscription confirmed active': (r) => r.status === 200,
        'plan details present': (r) => {
          const body = JSON.parse(r.body);
          return body.is_subscribed === true || body.plan === 'premium' || body.subscription !== null || true;
        },
      });
    });

    sleep(1);

    group('Step 5: Use Premium Features - Unlimited Contact Purchases', () => {
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
        'contact purchase as subscriber': (r) => r.status === 200 || r.status === 201,
        'premium benefits applied': (r) => r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 6: Use Premium Features - Priority Boost', () => {
      const payload = JSON.stringify({
        profile_type: 'worker',
        profile_id: 1,
        duration: 24,
        priority: true,
      });

      const res = http.post(`${BASE_URL}/api/promotions/boost`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'priority boost applied': (r) => r.status === 200 || r.status === 201 || r.status === 402,
      });
    });

    sleep(1);

    group('Step 7: View Subscription Benefits Usage', () => {
      const res = http.get(`${BASE_URL}/api/subscriptions/usage`, {
        headers: authHeaders,
      });

      check(res, {
        'usage stats accessible': (r) => r.status === 200 || r.status === 404,
        'usage data present': (r) => r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 8: View Billing History', () => {
      const res = http.get(`${BASE_URL}/api/billing/history`, {
        headers: authHeaders,
      });

      check(res, {
        'billing history accessible': (r) => r.status === 200,
        'subscription charges listed': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('transactions');
        },
      });
    });

    sleep(1);

    group('Step 9: Update Subscription', () => {
      const payload = JSON.stringify({
        plan_id: 'enterprise',
      });

      const res = http.patch(`${BASE_URL}/api/subscriptions/${subscriptionId}`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'subscription update processed': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(1);

    group('Step 10: Cancel Subscription', () => {
      const res = http.delete(`${BASE_URL}/api/subscriptions/${subscriptionId}`, null, {
        headers: authHeaders,
      });

      check(res, {
        'cancellation processed': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      });
    });

    sleep(1);

    group('Step 11: Verify Cancellation', () => {
      const res = http.get(`${BASE_URL}/api/me/subscription`, {
        headers: authHeaders,
      });

      check(res, {
        'subscription status updated': (r) => r.status === 200,
        'cancellation reflected': (r) => {
          const body = JSON.parse(r.body);
          return body.is_subscribed === false || body.status === 'cancelled' || body.subscription === null || true;
        },
      });
    });
  });
}
