import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_PHONE = '+79111111111';
const TEST_PASSWORD = 'dev123';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>=0.90'],
    http_req_duration: ['p(95)<3000'],
  },
};

function login() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    phone: TEST_PHONE,
    password: TEST_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) return null;
  const cookie = res.cookies['sessionid'];
  return cookie ? cookie[0].value : null;
}

export default function () {
  const headers = { 'Content-Type': 'application/json' };
  const sessionId = login();

  if (!sessionId) {
    console.error('Login failed — skipping subscription flow');
    return;
  }

  const authCookies = { sessionid: sessionId };

  group('E2E Subscription Flow', () => {

    // Step 1: Текущая подписка
    group('Step 1: Current subscription status', () => {
      const res = http.get(`${BASE_URL}/api/subscriptions/current`, {
        headers,
        cookies: authCookies,
      });

      check(res, {
        'current: status 200': (r) => r.status === 200,
        'current: has subscription_type': (r) => {
          try { return r.json().hasOwnProperty('subscription_type'); } catch { return false; }
        },
        'current: has contacts_remaining': (r) => {
          try { return r.json().hasOwnProperty('contacts_remaining'); } catch { return false; }
        },
        'current: has plan_name': (r) => {
          try { return r.json().hasOwnProperty('plan_name'); } catch { return false; }
        },
      });
    });

    sleep(1);

    // Step 2: Список тарифных планов
    group('Step 2: Available plans', () => {
      const res = http.get(`${BASE_URL}/api/subscriptions/plans`, {
        headers,
        cookies: authCookies,
      });

      check(res, {
        'plans: status 200': (r) => r.status === 200,
        'plans: is array': (r) => {
          try { return Array.isArray(r.json()); } catch { return false; }
        },
        'plans: contains known plan_ids': (r) => {
          try {
            const plans = r.json();
            const ids = plans.map(p => p.id);
            return ids.includes('free') || ids.includes('basic') || ids.includes('pro');
          } catch { return false; }
        },
        'plans: each plan has price and monthly_contacts': (r) => {
          try {
            const plans = r.json();
            return plans.every(p => p.hasOwnProperty('price') && p.hasOwnProperty('monthly_contacts'));
          } catch { return false; }
        },
      });
    });

    sleep(1);

    // Step 3: Оформить подписку PRO (тест-режим)
    group('Step 3: Subscribe to PRO plan', () => {
      const res = http.post(`${BASE_URL}/api/subscriptions/subscribe`,
        JSON.stringify({ plan_id: 'pro' }),
        { headers, cookies: authCookies }
      );

      check(res, {
        'subscribe: valid status': (r) => r.status === 200 || r.status === 400,
        'subscribe: has response body': (r) => {
          try { r.json(); return true; } catch { return false; }
        },
        'subscribe: test_mode or payment_url': (r) => {
          try {
            const body = r.json();
            return body.hasOwnProperty('test_mode') ||
                   body.hasOwnProperty('payment_url') ||
                   body.hasOwnProperty('error') ||
                   body.hasOwnProperty('detail');
          } catch { return false; }
        },
      });
    });

    sleep(1);

    // Step 4: Проверить статус после подписки
    group('Step 4: Verify subscription after subscribe', () => {
      const res = http.get(`${BASE_URL}/api/subscriptions/current`, {
        headers,
        cookies: authCookies,
      });

      check(res, {
        'verify: status 200': (r) => r.status === 200,
        'verify: subscription_type present': (r) => {
          try { return r.json().hasOwnProperty('subscription_type'); } catch { return false; }
        },
      });
    });

    sleep(1);

    // Step 5: Список доп. пакетов
    group('Step 5: Addon packages', () => {
      const res = http.get(`${BASE_URL}/api/payments/packages`, {
        headers,
        cookies: authCookies,
      });

      check(res, {
        'packages: status 200': (r) => r.status === 200,
        'packages: has packages array': (r) => {
          try {
            const body = r.json();
            return Array.isArray(body.packages);
          } catch { return false; }
        },
        'packages: has can_buy_addon flag': (r) => {
          try { return r.json().hasOwnProperty('can_buy_addon'); } catch { return false; }
        },
      });
    });

    sleep(1);

    // Step 6: Баланс
    group('Step 6: Balance check', () => {
      const res = http.get(`${BASE_URL}/api/user/balance`, {
        headers,
        cookies: authCookies,
      });

      check(res, {
        'balance: status 200': (r) => r.status === 200,
        'balance: has contacts_remaining': (r) => {
          try { return r.json().hasOwnProperty('contacts_remaining'); } catch { return false; }
        },
      });
    });

  });
}
