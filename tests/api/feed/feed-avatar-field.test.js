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

  // --- Публичная лента ---
  group('Feed Avatar Field - Public feed items have avatar', () => {
    const res = http.get(`${BASE_URL}/api/feed`, { headers: authHeaders });
    check(res, {
      'feed 200': (r) => r.status === 200,
      'feed items have avatar field': (r) => {
        try {
          const body = JSON.parse(r.body);
          const items = Array.isArray(body) ? body : (body.results || body.items || []);
          if (items.length === 0) return true; // пустая лента — ok
          return items.every(item => item.hasOwnProperty('avatar'));
        } catch (_) { return false; }
      },
      'vacancy items have avatar': (r) => {
        try {
          const body = JSON.parse(r.body);
          const items = Array.isArray(body) ? body : (body.results || body.items || []);
          const vacancies = items.filter(i => i.type === 'vacancy');
          if (vacancies.length === 0) return true;
          return vacancies.every(v => v.hasOwnProperty('avatar'));
        } catch (_) { return false; }
      },
      'resume items have avatar': (r) => {
        try {
          const body = JSON.parse(r.body);
          const items = Array.isArray(body) ? body : (body.results || body.items || []);
          const resumes = items.filter(i => i.type === 'resume');
          if (resumes.length === 0) return true;
          return resumes.every(v => v.hasOwnProperty('avatar'));
        } catch (_) { return false; }
      },
    });
  });

  // --- Лента с фильтром по вакансиям ---
  group('Feed Avatar Field - Vacancy feed avatar is string or emoji', () => {
    const res = http.get(`${BASE_URL}/api/feed?type=vacancy`, { headers: authHeaders });
    check(res, {
      'vacancy feed 200': (r) => r.status === 200,
      'avatar is string': (r) => {
        try {
          const body = JSON.parse(r.body);
          const items = Array.isArray(body) ? body : (body.results || body.items || []);
          if (items.length === 0) return true;
          return items.every(v => typeof v.avatar === 'string' && v.avatar.length > 0);
        } catch (_) { return false; }
      },
    });
  });

  // --- Моя лента (авторизованная) ---
  group('Feed Avatar Field - My feed items have avatar', () => {
    const res = http.get(`${BASE_URL}/api/my-feed`, { headers: authHeaders });
    check(res, {
      'my-feed 200': (r) => r.status === 200,
      'my-feed items have avatar': (r) => {
        try {
          const body = JSON.parse(r.body);
          const items = Array.isArray(body) ? body : (body.results || body.items || []);
          if (items.length === 0) return true;
          return items.every(item => item.hasOwnProperty('avatar'));
        } catch (_) { return false; }
      },
    });
  });

  // --- Профили содержат contact_person/contact_phone (для autofill) ---
  group('Profiles List - employer/customer have contact fields', () => {
    const res = http.get(`${BASE_URL}/api/profiles`, { headers: authHeaders });
    check(res, {
      'profiles 200': (r) => r.status === 200,
      'employer profiles have contact_person': (r) => {
        try {
          const body = JSON.parse(r.body);
          const employers = body.filter(p => p.type === 'employer');
          if (employers.length === 0) return true;
          return employers.every(p => p.hasOwnProperty('contact_person'));
        } catch (_) { return false; }
      },
      'customer profiles have contact_phone': (r) => {
        try {
          const body = JSON.parse(r.body);
          const customers = body.filter(p => p.type === 'customer');
          if (customers.length === 0) return true;
          return customers.every(p => p.hasOwnProperty('contact_phone'));
        } catch (_) { return false; }
      },
    });
  });
}
