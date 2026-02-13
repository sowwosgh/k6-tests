import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export let options = {
  vus: 5,
  duration: '3m',
};

export default function () {
  // 1. Открыть ленту
  let res = http.get(`${BASE_URL}/api/feed?limit=10`);
  let data = parseJsonSafe(res);
  check(res, {
    'feed loaded': (r) => r.status === 200,
    'feed is json': (r) => isJsonResponse(r),
    'feed is array': () => Array.isArray(data),
  });
  sleep(2);
  
  // 2. Посмотреть карточки
  res = http.get(`${BASE_URL}/api/feed?type=worker&limit=5`);
  data = parseJsonSafe(res);
  check(res, {
    'cards loaded': (r) => r.status === 200,
    'cards is json': (r) => isJsonResponse(r),
    'cards is array': () => Array.isArray(data),
  });
  sleep(1);
  
  // 3. Применить фильтр
  res = http.get(`${BASE_URL}/api/feed?search=it&city=moscow&limit=10`);
  data = parseJsonSafe(res);
  check(res, {
    'filters applied': (r) => r.status === 200,
    'filters is json': (r) => isJsonResponse(r),
    'filters is array': () => Array.isArray(data),
  });
  sleep(1);
}