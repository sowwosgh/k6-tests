import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';
import { loginAndGetSession } from '../../../utils/auth.js';

const TEST_USER = '+79001234567';
const TEST_PASSWORD = 'test123';

// Types that must have avatar as URL or null (never an emoji string)
const AVATAR_TYPES = ['vacancy', 'order', 'tender', 'worker', 'brigade', 'contractor', 'customer', 'employer'];

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<3000'],
  },
};

function isValidAvatarValue(val) {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'string') return false;
  return val.startsWith('http') || val.startsWith('/');
}

function isEmojiOrInvalid(val) {
  if (val === null || val === undefined) return false;
  if (typeof val !== 'string') return false;
  // If it's a URL — it's valid (not emoji)
  if (val.startsWith('http') || val.startsWith('/')) return false;
  // Anything else (emoji, placeholder text) is invalid
  return true;
}

/**
 * Feed Avatar Fields Tests
 *
 * Verifies that feed endpoints return avatar as a proper URL (or null),
 * NOT as an emoji string like "📢", "📦", "🏆".
 *
 * Tests:
 * 1. Public feed — avatar field is URL or null for all card types
 * 2. My feed (authenticated) — avatar field is URL or null
 * 3. Public feed per type — vacancy, order, tender avatar fields
 */
export default function () {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);

  const authHeaders = sessionid
    ? { ...jsonHeaders, 'Cookie': `sessionid=${sessionid}` }
    : jsonHeaders;

  // ===========================================
  // Test 1: Public Feed — avatar field validity
  // ===========================================
  group('Public Feed - Avatar Fields', () => {
    const res = http.get(`${BASE_URL}/api/feed?page_size=50`);

    check(res, {
      'public feed status 200': (r) => r.status === 200,
    });

    if (res.status !== 200) return;

    let items = [];
    try {
      const body = res.json();
      items = Array.isArray(body) ? body : (body.results || body.items || []);
    } catch (e) {
      console.error('Failed to parse feed response:', e);
      return;
    }

    console.log(`\nPublic feed: ${items.length} items`);

    let emojiCount = 0;
    let invalidItems = [];

    items.forEach((item) => {
      const type = item.type || item.announcement_type || '';
      if (!AVATAR_TYPES.includes(type)) return;

      const avatarVal = item.avatar ?? item.photo ?? item.logo ?? null;

      if (isEmojiOrInvalid(avatarVal)) {
        emojiCount++;
        invalidItems.push({ id: item.id, type, avatar: avatarVal });
      }
    });

    if (invalidItems.length > 0) {
      console.error('❌ Items with emoji/invalid avatar:', JSON.stringify(invalidItems));
    }

    check(res, {
      'no feed items have emoji avatar': () => emojiCount === 0,
      'all avatar values are URL or null': () => {
        return items
          .filter(i => AVATAR_TYPES.includes(i.type || i.announcement_type || ''))
          .every(i => isValidAvatarValue(i.avatar ?? i.photo ?? i.logo ?? null));
      },
    });
  });

  // ===========================================
  // Test 2: My Feed — avatar field validity
  // ===========================================
  group('My Feed - Avatar Fields', () => {
    if (!sessionid) {
      console.log('Skipping my feed test — no session');
      return;
    }

    const res = http.get(`${BASE_URL}/api/my-feed?page_size=50`, {
      headers: authHeaders,
    });

    check(res, {
      'my feed status 200': (r) => r.status === 200,
    });

    if (res.status !== 200) return;

    let items = [];
    try {
      const body = res.json();
      items = Array.isArray(body) ? body : (body.results || body.items || []);
    } catch (e) {
      console.error('Failed to parse my-feed response:', e);
      return;
    }

    console.log(`\nMy feed: ${items.length} items`);

    let emojiCount = 0;
    items.forEach((item) => {
      const avatarVal = item.avatar ?? item.photo ?? item.logo ?? null;
      if (isEmojiOrInvalid(avatarVal)) emojiCount++;
    });

    check(res, {
      'no my-feed items have emoji avatar': () => emojiCount === 0,
    });
  });

  // ===========================================
  // Test 3: Per-type feed — vacancy, order, tender
  // ===========================================
  const TYPED_CHECKS = [
    { type: 'vacancy', endpoint: '/api/feed?type=vacancy&page_size=20' },
    { type: 'order',   endpoint: '/api/feed?type=order&page_size=20' },
    { type: 'tender',  endpoint: '/api/feed?type=tender&page_size=20' },
  ];

  TYPED_CHECKS.forEach(({ type, endpoint }) => {
    group(`Feed[${type}] - Avatar Field`, () => {
      const res = http.get(`${BASE_URL}${endpoint}`);

      check(res, {
        [`${type} feed status 200`]: (r) => r.status === 200,
      });

      if (res.status !== 200) return;

      let items = [];
      try {
        const body = res.json();
        items = Array.isArray(body) ? body : (body.results || body.items || []);
      } catch (e) { return; }

      console.log(`\nFeed[${type}]: ${items.length} items`);

      const invalidAvatars = items.filter(i => isEmojiOrInvalid(i.avatar ?? null));

      if (invalidAvatars.length > 0) {
        console.error(`❌ [${type}] emoji avatars:`, invalidAvatars.map(i => ({ id: i.id, avatar: i.avatar })));
      }

      check(res, {
        [`${type} items have no emoji avatar`]: () => invalidAvatars.length === 0,
        [`${type} avatar is URL or null`]: () =>
          items.every(i => isValidAvatarValue(i.avatar ?? null)),
      });
    });
  });

  console.log('\n✅ Feed avatar fields tests completed');
}
