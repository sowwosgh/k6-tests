import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';
import { isJsonResponse, parseJsonSafe } from '../../utils/checks.js';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';

export let options = {
  vus: 5,
  duration: '3m',
};

function checkFeedArrayResponse(response, title) {
  const parsedBody = parseJsonSafe(response);

  check(response, {
    [`${title} loaded`]: (r) => r.status === 200,
    [`${title} is json`]: (r) => isJsonResponse(r),
    [`${title} is array`]: () => Array.isArray(parsedBody),
  });
}

export default function () {
  // 1. Открыть ленту
  let response = http.get(`${BASE_URL}/api/feed?limit=10`);
  checkFeedArrayResponse(response, 'feed');
  sleep(2);
  
  // 2. Посмотреть карточки
  response = http.get(`${BASE_URL}/api/feed?type=worker&limit=5`);
  checkFeedArrayResponse(response, 'cards');
  sleep(1);
  
  // 3. Применить фильтр
  response = http.get(`${BASE_URL}/api/feed?search=it&city=moscow&limit=10`);
  checkFeedArrayResponse(response, 'filters');
  sleep(1);
}