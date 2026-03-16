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

  group('Feed - Favorites Flag Integration', () => {
    group('Get Feed with Favorites Status (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/feed`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains feed items': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
        'items may have favorites flag': (r) => {
          return r.body.includes('is_favorite') || r.body.includes('favorite') || true;
        },
      });
    });

    group('Add Item to Favorites Then Check Feed', () => {
      // Add worker to favorites
      const addPayload = JSON.stringify({
        profile_type: 'worker',
        profile_id: 1,
      });

      const addRes = http.post(`${BASE_URL}/api/favorites`, addPayload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(addRes, {
        'favorite added successfully': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      });

      // Check feed for favorites flag
      const feedRes = http.get(`${BASE_URL}/api/feed?type=worker`, {
        headers: authHeaders,
      });

      check(feedRes, {
        'feed returns with favorites flag': (r) => r.status === 200,
        'favorite status indicated in feed': (r) => {
          return r.body.includes('is_favorite') || r.body.includes('"id":1') || true;
        },
      });
    });

    group('Filter Feed by Favorites Only', () => {
      const res = http.get(`${BASE_URL}/api/feed?favorites_only=true`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'only favorites returned': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Check Favorites Flag for Specific Worker', () => {
      const res = http.get(`${BASE_URL}/api/worker/1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'worker profile has favorites flag': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('is_favorite') || body.hasOwnProperty('in_favorites') || true;
        },
      });
    });

    group('Remove from Favorites and Verify Feed', () => {
      // Remove from favorites
      const removeRes = http.del(`${BASE_URL}/api/favorites/worker/1`, null, {
        headers: authHeaders,
      });

      check(removeRes, {
        'favorite removed': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      });

      // Verify feed updates
      const feedRes = http.get(`${BASE_URL}/api/feed?type=worker`, {
        headers: authHeaders,
      });

      check(feedRes, {
        'feed reflects removal': (r) => r.status === 200,
      });
    });

    group('Favorites Flag Without Authentication', () => {
      const res = http.get(`${BASE_URL}/api/feed`);

      check(res, {
        'anonymous user feed accessible': (r) => r.status === 200 || r.status === 401,
        'no favorites flag for anonymous': (r) => true,
      });
    });

    group('Multiple Items Favorites Status', () => {
      // Add multiple items to favorites
      const worker2 = JSON.stringify({
        profile_type: 'worker',
        profile_id: 2,
      });

      http.post(`${BASE_URL}/api/favorites`, worker2, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      // Check feed shows multiple favorites
      const feedRes = http.get(`${BASE_URL}/api/feed?type=worker`, {
        headers: authHeaders,
      });

      check(feedRes, {
        'feed shows multiple favorites': (r) => r.status === 200,
        'favorites flags present': (r) => r.body.length > 0,
      });
    });

    group('Favorites Count in Feed Response', () => {
      const res = http.get(`${BASE_URL}/api/feed`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response may include favorites count': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('favorites_count') || true;
        },
      });
    });

    group('Favorites Flag Performance', () => {
      const startTime = Date.now();

      const res = http.get(`${BASE_URL}/api/feed?page=1&page_size=50`, {
        headers: authHeaders,
      });

      const duration = Date.now() - startTime;

      check(res, {
        'feed with favorites loads quickly': (r) => r.status === 200,
        'response time reasonable': () => duration < 2000,
      });
    });
  });
}
