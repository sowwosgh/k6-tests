import http from 'k6/http';
import { check } from 'k6';
import { checkStatus } from '../../utils/checks.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
};

const BASE_URL = 'http://127.0.0.1:8000';

export default function () {
  // Проверка ленты
  const feedRes = http.get(`${BASE_URL}/api/feed?limit=1`);
  checkStatus(feedRes, 'Feed API');
}
