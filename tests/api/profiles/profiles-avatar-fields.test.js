import http from 'k6/http';
import { check, group } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_USER = '+79001234567';
const TEST_PASSWORD = 'test123';

// Profile types that must have avatar as URL or null (never emoji)
const PROFILE_TYPES = ['worker', 'brigade', 'contractor', 'customer', 'employer'];

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
  if (val.startsWith('http') || val.startsWith('/')) return false;
  return true;
}

/**
 * Profiles List — Avatar Fields Test
 *
 * Verifies GET /api/profiles returns avatar as URL or null,
 * not as emoji string.
 *
 * Tests:
 * 1. Profiles list — all items have valid avatar field
 * 2. Each profile type individually checked
 * 3. Unauthenticated — 401
 */
export default function () {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!sessionid) { console.error('❌ Auth failed'); return; }

  const authHeaders = { ...jsonHeaders, 'Cookie': `sessionid=${sessionid}` };

  // ===========================================
  // Test 1: Profiles list — avatar field validity
  // ===========================================
  group('Profiles List - Avatar Fields', () => {
    const res = http.get(`${BASE_URL}/api/profiles`, { headers: authHeaders });

    check(res, {
      'profiles status 200': (r) => r.status === 200,
    });

    if (res.status !== 200) {
      console.error('Failed to get profiles:', res.body);
      return;
    }

    let profiles = [];
    try {
      const body = res.json();
      profiles = Array.isArray(body) ? body : (body.results || body.items || []);
    } catch (e) {
      console.error('Failed to parse profiles response:', e);
      return;
    }

    console.log(`\nProfiles: ${profiles.length} items`);

    let emojiCount = 0;
    let invalidItems = [];

    profiles.forEach((profile) => {
      const type = profile.type || '';
      if (!PROFILE_TYPES.includes(type)) return;

      // Avatar field may be called avatar or logo
      const avatarVal = profile.avatar ?? profile.logo ?? null;

      if (isEmojiOrInvalid(avatarVal)) {
        emojiCount++;
        invalidItems.push({ id: profile.id, type, avatar: avatarVal });
      }
    });

    if (invalidItems.length > 0) {
      console.error('❌ Profiles with emoji/invalid avatar:', JSON.stringify(invalidItems));
    } else {
      console.log('✅ All profile avatars are valid (URL or null)');
    }

    check(res, {
      'no profiles have emoji avatar': () => emojiCount === 0,
      'all profile avatar values are URL or null': () =>
        profiles
          .filter(p => PROFILE_TYPES.includes(p.type || ''))
          .every(p => isValidAvatarValue(p.avatar ?? p.logo ?? null)),
    });

    // Per-type breakdown
    PROFILE_TYPES.forEach((type) => {
      const typeProfiles = profiles.filter(p => p.type === type);
      if (typeProfiles.length === 0) return;

      const invalidForType = typeProfiles.filter(p => isEmojiOrInvalid(p.avatar ?? p.logo ?? null));
      console.log(`  [${type}]: ${typeProfiles.length} profiles, ${invalidForType.length} invalid avatars`);

      check(res, {
        [`[${type}] avatar is URL or null`]: () => invalidForType.length === 0,
      });
    });
  });

  // ===========================================
  // Test 2: Active profile — avatar field
  // ===========================================
  group('Active Profile - Avatar Field', () => {
    const res = http.get(`${BASE_URL}/api/user/me`, { headers: authHeaders });

    if (res.status !== 200) return;

    try {
      const body = res.json();
      const avatarVal = body.avatar ?? null;
      console.log(`\nUser avatar: ${avatarVal}`);

      check(res, {
        'user avatar is URL or null': () => isValidAvatarValue(avatarVal),
        'user avatar is not emoji': () => !isEmojiOrInvalid(avatarVal),
      });
    } catch (e) { /* endpoint may not exist */ }
  });

  // ===========================================
  // Test 3: Unauthenticated
  // ===========================================
  group('Profiles List - Unauthenticated', () => {
    const jar = http.cookieJar();
    jar.clear(BASE_URL);

    const res = http.get(`${BASE_URL}/api/profiles`, { headers: jsonHeaders, jar });

    check(res, {
      '[Unauth] status 401 or 403': (r) => r.status === 401 || r.status === 403,
    });
  });

  console.log('\n✅ Profiles avatar fields tests completed');
}
