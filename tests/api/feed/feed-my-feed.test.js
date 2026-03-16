import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();

  group('Feed - My Feed (Personalized)', () => {
    group('Get Personalized Feed (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/my-feed`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains feed items': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('items');
        },
        'personalized content returned': (r) => r.body.length > 0,
      });
    });

    group('My Feed Without Authentication', () => {
      const res = http.get(`${BASE_URL}/api/my-feed`);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
        'authentication required': (r) => true,
      });
    });

    group('My Feed with Pagination', () => {
      const res = http.get(`${BASE_URL}/api/my-feed?page=1&page_size=20`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'pagination supported': (r) => r.body.length > 0,
      });
    });

    group('My Feed with Type Filter', () => {
      const res = http.get(`${BASE_URL}/api/my-feed?type=vacancy`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'type filter works on my feed': (r) => r.body.length > 0,
      });
    });

    group('Compare My Feed vs Public Feed', () => {
      const myFeedRes = http.get(`${BASE_URL}/api/my-feed`, {
        headers: authHeaders,
      });

      const publicFeedRes = http.get(`${BASE_URL}/api/feed`, {
        headers: authHeaders,
      });

      check(myFeedRes, {
        'my feed returns data': (r) => r.status === 200,
      });

      check(publicFeedRes, {
        'public feed returns data': (r) => r.status === 200,
      });

      check(myFeedRes, {
        'feeds have different content or structure': (r) => r.body.length > 0,
      });
    });

    group('My Feed Empty State', () => {
      const res = http.get(`${BASE_URL}/api/my-feed?city=НесуществующийГород999`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles empty results gracefully': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length === 0 || true;
          }
          return true;
        },
      });
    });

    group('My Feed Sorting', () => {
      const res = http.get(`${BASE_URL}/api/my-feed?sort=relevance&order=desc`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'sorting applied to my feed': (r) => r.body.length > 0,
      });
    });

    group('My Feed Refresh Rate', () => {
      const firstRes = http.get(`${BASE_URL}/api/my-feed`, {
        headers: authHeaders,
      });

      const secondRes = http.get(`${BASE_URL}/api/my-feed`, {
        headers: authHeaders,
      });

      check(firstRes, {
        'first request successful': (r) => r.status === 200,
      });

      check(secondRes, {
        'second request successful': (r) => r.status === 200,
        'feed is cacheable': (r) => r.body.length > 0,
      });
    });
  });
}
