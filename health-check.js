import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('http://127.0.0.1:8000/api/feed?limit=1');
  check(res, {
    'API ????????': (r) => r.status === 200,
    '?????? ????': (r) => JSON.parse(r.body).length > 0,
  });
}
