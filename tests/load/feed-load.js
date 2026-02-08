import http from 'k6/http';
import { check } from 'k6';
import { checkStatus, checkJsonArray } from '../../utils/checks.js';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05']
  }
};

const BASE_URL = 'http://127.0.0.1:8000';
const CARD_TYPES = ['worker', 'company', 'brigade', 'contractor'];

export default function () {
  // Тест фильтрации
  const filterRes = http.get(`${BASE_URL}/api/feed?city=moscow&limit=5`);
  checkStatus(filterRes, 'Filter API');
  
  // Тест типов карточек
  CARD_TYPES.forEach(type => {
    const res = http.get(`${BASE_URL}/api/feed?type=${type}&limit=3`);
    checkJsonArray(res, `${type} cards`);
  });
}
