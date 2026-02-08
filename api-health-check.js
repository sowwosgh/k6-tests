import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = 'http://127.0.0.1:8000';

export default function () {
  // 1. Главная страница API
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'API доступен': (r) => r.status === 200,
  });

  // 2. Публичные профили
  const profilesRes = http.get(`${BASE_URL}/api/public/profiles/`);
  check(profilesRes, {
    'Профили доступны': (r) => r.status === 200,
  });

  // 3. Категории
  const categoriesRes = http.get(`${BASE_URL}/api/public/categories/`);
  check(categoriesRes, {
    'Категории доступны': (r) => r.status === 200,
  });

  // 4. Health check (если есть)
  const healthRes = http.get(`${BASE_URL}/api/health/`);
  check(healthRes, {
    'Health check OK': (r) => r.status === 200 || r.status === 404,
  });
}