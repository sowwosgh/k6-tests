import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 3, duration: '15s' };

const BASE_URL = 'http://127.0.0.1:8000';
const CARD_TYPES = ['worker', 'company', 'brigade', 'contractor'];

export default function () {
  CARD_TYPES.forEach(type => {
    const res = http.get(`${BASE_URL}/api/feed?type=${type}&limit=5`);
    check(res, {
      [`${type} cards ????????`]: (r) => r.status === 200,
      [`${type} ?????????? ??????`]: (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
  });
}
