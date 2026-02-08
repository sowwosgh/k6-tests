// messages-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 5, duration: '30s' };
const BASE_URL = 'http://127.0.0.1:8000';
const token = 'ВАШ_ТОКЕН';

export default function () {
  // Отправка отклика
  const response = http.post(
    `${BASE_URL}/api/messages/respond/`,
    JSON.stringify({ profile_id: 1, message: 'Здравствуйте, готов помочь!' }),
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  check(response, { 'Отклик отправлен': (r) => r.status === 201 });
  sleep(1);
}