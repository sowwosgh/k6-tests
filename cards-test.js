// cards-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 3,
  duration: '15s',
};

const BASE_URL = 'http://127.0.0.1:8000';
const CARD_TYPES = [
  'specialist', 'team', 'contractor',
  'vacancy', 'resume', 'order',
  'tender', 'service', 'equipment'
];

export default function () {
  CARD_TYPES.forEach(type => {
    const res = http.get(`${BASE_URL}/api/public/profiles/?type=${type}`);
    check(res, {
      [`${type} cards доступны`]: (r) => r.status === 200,
      [`${type} возвращает массив`]: (r) => Array.isArray(r.json()),
    });
  });
}