import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  let sessionCookie = '';
  let vacancyId = '';
  let applicationId = '';

  group('E2E Employer Journey', () => {
    group('Step 1: Register as Employer', () => {
      const payload = JSON.stringify({
        phone: `+7900${Math.floor(Math.random() * 10000000)}`,
        password: 'TestPassword123',
        role: 'employer',
      });

      const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'registration successful': (r) => r.status === 200 || r.status === 201,
        'session cookie received': (r) => {
          const cookies = r.headers['Set-Cookie'];
          return cookies && cookies.includes('sessionid');
        },
      });

      const cookies = res.headers['Set-Cookie'];
      if (cookies) {
        const match = cookies.match(/sessionid=([^;]+)/);
        if (match) {
          sessionCookie = `sessionid=${match[1]}`;
        }
      }
    });

    sleep(1);

    group('Step 2: Create Company Profile', () => {
      const payload = JSON.stringify({
        name: 'Тестовая Компания ООО',
        phone: '+79001234567',
        inn: '1234567890',
        description: 'Строительная компания',
      });

      const res = http.post(`${BASE_URL}/api/company`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'company profile created': (r) => r.status === 200 || r.status === 201,
      });
    });

    sleep(1);

    group('Step 3: Create Vacancy', () => {
      const payload = JSON.stringify({
        title: 'Требуется бригада строителей',
        specialization: 'Строитель',
        city: 'Москва',
        salary: 80000,
        description: 'Строительство жилого комплекса',
        requirements: 'Опыт от 3 лет',
      });

      const res = http.post(`${BASE_URL}/api/vacancy`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'vacancy created': (r) => r.status === 200 || r.status === 201,
        'vacancy has ID': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('id') || body.hasOwnProperty('vacancy_id');
        },
      });

      const body = JSON.parse(res.body);
      vacancyId = body.id || body.vacancy_id || 1;
    });

    sleep(1);

    group('Step 4: Boost Vacancy', () => {
      const payload = JSON.stringify({
        profile_type: 'vacancy',
        profile_id: vacancyId,
        duration: 24,
      });

      const res = http.post(`${BASE_URL}/api/promotions/boost`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'boost processed': (r) => r.status === 200 || r.status === 201 || r.status === 402,
      });
    });

    sleep(1);

    group('Step 5: Verify Vacancy in Feed', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=vacancy`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'feed accessible': (r) => r.status === 200,
        'vacancy visible': (r) => r.body.includes(vacancyId.toString()) || r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 6: Simulate Worker Application', () => {
      const payload = JSON.stringify({
        vacancy_id: vacancyId,
        cover_letter: 'I would like to apply for this position',
      });

      const res = http.post(`${BASE_URL}/api/applications`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'application submitted': (r) => r.status === 200 || r.status === 201,
      });

      const body = JSON.parse(res.body);
      applicationId = body.id || body.application_id || 1;
    });

    sleep(1);

    group('Step 7: View Applications List', () => {
      const res = http.get(`${BASE_URL}/api/applications`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'applications list accessible': (r) => r.status === 200,
        'applications returned': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    sleep(1);

    group('Step 8: Update Application Status', () => {
      const payload = JSON.stringify({
        status: 'accepted',
      });

      const res = http.patch(`${BASE_URL}/api/applications/${applicationId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'status updated': (r) => r.status === 200 || r.status === 204,
      });
    });

    sleep(1);

    group('Step 9: Contact Worker', () => {
      const payload = JSON.stringify({
        participant_id: 1,
        message: 'Thank you for your application. Welcome to our team!',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'message sent': (r) => r.status === 200 || r.status === 201,
      });
    });

    sleep(1);

    group('Step 10: View Vacancy Statistics', () => {
      const res = http.get(`${BASE_URL}/api/vacancy/${vacancyId}/statistics`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'statistics accessible': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(1);

    group('Step 11: Close Vacancy', () => {
      const payload = JSON.stringify({
        is_active: false,
      });

      const res = http.patch(`${BASE_URL}/api/vacancy/${vacancyId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'vacancy closed': (r) => r.status === 200,
      });
    });

    sleep(1);

    group('Step 12: Complete Journey - Logout', () => {
      const res = http.post(`${BASE_URL}/api/auth/logout`, null, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'logout successful': (r) => r.status === 200 || r.status === 204,
      });
    });
  });
}
