import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.05'],
  },
};

const BASE_URL = 'http://127.0.0.1:8000';

export default function () {
  // 1. Запрос SMS-кода
  const phone = `79${randomIntBetween(100000000, 999999999)}`;
  const smsRes = http.post(`${BASE_URL}/api/auth/request-sms/`, {
    phone: phone,
  });

  check(smsRes, {
    'SMS запрос успешен': (r) => r.status === 200 || r.status === 201,
  });

  // Ждем 1 сек (имитация ввода кода)
  sleep(1);

  // 2. Подтверждение кода (тестовый код 123456)
  const verifyRes = http.post(`${BASE_URL}/api/auth/verify-sms/`, {
    phone: phone,
    code: '123456',
  });

  check(verifyRes, {
    'Верификация успешна': (r) => r.status === 200,
    'Получен токен': (r) => r.json().access !== undefined,
  });

  // 3. Создание профиля
  if (verifyRes.status === 200) {
    const token = verifyRes.json().access;
    const profileRes = http.post(
      `${BASE_URL}/api/profiles/`,
      {
        user_type: 'specialist',
        full_name: `Тест Пользователь ${phone.slice(-4)}`,
        category: 'electrician',
        experience_years: randomIntBetween(1, 10),
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(profileRes, {
      'Профиль создан': (r) => r.status === 201,
    });
  }

  sleep(2);
}