// filters-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 2, duration: '10s' };
const BASE_URL = 'http://127.0.0.1:8000';

export default function () {
  const filters = [
    '?category=electrician&city=moscow',
    '?experience_min=2&experience_max=10',
    '?price_min=100&price_max=1000',
    '?sort=-rating&limit=10',
  ];

  filters.forEach(filter => {
    const res = http.get(`${BASE_URL}/api/public/profiles/${filter}`);
    check(res, { [`filter ${filter} работает`]: (r) => r.status === 200 });
  });
}