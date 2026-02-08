import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    'http_req_duration{api:payment}': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = 'http://127.0.0.1:8000';

// Тестовый пользователь с токеном
const TEST_USER = {
  token: 'ВАШ_ТЕСТОВЫЙ_ТОКЕН', // Замени на реальный
  profile_id: 1, // ID тестового профиля
};

const headers = {
  'Authorization': `Bearer ${TEST_USER.token}`,
  'Content-Type': 'application/json',
};

export default function () {
  group('1. Просмотр профиля (превью)', () => {
    const res = http.get(`${BASE_URL}/api/profiles/${TEST_USER.profile_id}/`, {
      tags: { api: 'preview' },
    });
    
    check(res, {
      'Профиль доступен': (r) => r.status === 200,
      'Цена указана': (r) => r.json().price !== undefined,
    });
  });

  sleep(1);

  group('2. Пополнение баланса', () => {
    const res = http.post(
      `${BASE_URL}/api/payments/deposit/`,
      JSON.stringify({ amount: 300 }), // 300₽
      { headers: headers, tags: { api: 'deposit' } }
    );

    check(res, {
      'Баланс пополнен': (r) => r.status === 200,
      'Баланс обновлен': (r) => r.json().balance >= 300,
    });
  });

  sleep(1);

  group('3. Покупка контакта', () => {
    const res = http.post(
      `${BASE_URL}/api/payments/buy-contact/`,
      JSON.stringify({ profile_id: TEST_USER.profile_id }),
      { headers: headers, tags: { api: 'payment' } }
    );

    check(res, {
      'Контакт куплен': (r) => r.status === 200,
      'Контакт разблокирован': (r) => r.json().unlocked === true,
      'Баланс уменьшился': (r) => r.json().new_balance < 300,
    });
  });

  sleep(2);

  group('4. Проверка доступа к контактам', () => {
    const res = http.get(
      `${BASE_URL}/api/profiles/${TEST_USER.profile_id}/contacts/`,
      { headers: headers, tags: { api: 'contacts' } }
    );

    check(res, {
      'Контакты доступны': (r) => r.status === 200,
      'Есть телефон': (r) => r.json().phone !== undefined,
    });
  });
}