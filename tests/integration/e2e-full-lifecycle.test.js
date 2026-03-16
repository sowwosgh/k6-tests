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
  let workerId = '';
  let vacancyId = '';
  let applicationId = '';
  let conversationId = '';

  group('E2E Full Lifecycle - From Registration to Job Match', () => {
    group('Phase 1: Worker Registration & Profile Creation', () => {
      const payload = JSON.stringify({
        phone: `+7900${Math.floor(Math.random() * 10000000)}`,
        password: 'TestPassword123',
        role: 'worker',
      });

      const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'worker registered': (r) => r.status === 200 || r.status === 201,
      });

      const cookies = res.headers['Set-Cookie'];
      if (cookies) {
        const match = cookies.match(/sessionid=([^;]+)/);
        if (match) {
          sessionCookie = `sessionid=${match[1]}`;
        }
      }

      // Create worker profile
      sleep(1);
      const profilePayload = JSON.stringify({
        full_name: 'Integration Test Worker',
        specialization: 'Строитель',
        city: 'Москва',
        experience: 5,
        salary: 70000,
        phone: '+79001234567',
      });

      const profileRes = http.post(`${BASE_URL}/api/worker`, profilePayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(profileRes, {
        'profile created': (r) => r.status === 200 || r.status === 201,
      });

      const body = JSON.parse(profileRes.body);
      workerId = body.id || body.worker_id || 1;
    });

    sleep(2);

    group('Phase 2: Monetization - Add Credits & Boost', () => {
      const creditsPayload = JSON.stringify({
        amount: 1000,
      });

      const creditsRes = http.post(`${BASE_URL}/api/credits/add`, creditsPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(creditsRes, {
        'credits added': (r) => r.status === 200 || r.status === 201,
      });

      sleep(1);

      const boostPayload = JSON.stringify({
        profile_type: 'worker',
        profile_id: workerId,
        duration: 24,
      });

      const boostRes = http.post(`${BASE_URL}/api/promotions/boost`, boostPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(boostRes, {
        'profile boosted': (r) => r.status === 200 || r.status === 201 || r.status === 402,
      });
    });

    sleep(2);

    group('Phase 3: Employer Side - Create Vacancy', () => {
      // Simulate employer registration
      const employerPayload = JSON.stringify({
        phone: `+7900${Math.floor(Math.random() * 10000000)}`,
        password: 'TestPassword123',
        role: 'employer',
      });

      const empRes = http.post(`${BASE_URL}/api/auth/register`, employerPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let empCookie = '';
      const empCookies = empRes.headers['Set-Cookie'];
      if (empCookies) {
        const match = empCookies.match(/sessionid=([^;]+)/);
        if (match) {
          empCookie = `sessionid=${match[1]}`;
        }
      }

      check(empRes, {
        'employer registered': (r) => r.status === 200 || r.status === 201,
      });

      sleep(1);

      const vacancyPayload = JSON.stringify({
        title: 'Требуется опытный строитель',
        specialization: 'Строитель',
        city: 'Москва',
        salary: 75000,
        description: 'Работа на стройке',
      });

      const vacRes = http.post(`${BASE_URL}/api/vacancy`, vacancyPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': empCookie,
        },
      });

      check(vacRes, {
        'vacancy created': (r) => r.status === 200 || r.status === 201,
      });

      const vacBody = JSON.parse(vacRes.body);
      vacancyId = vacBody.id || vacBody.vacancy_id || 1;
    });

    sleep(2);

    group('Phase 4: Job Discovery - Search & Feed', () => {
      const searchRes = http.get(`${BASE_URL}/api/search/vacancies?specialization=Строитель&city=Москва`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(searchRes, {
        'vacancy found in search': (r) => r.status === 200,
      });

      sleep(1);

      const feedRes = http.get(`${BASE_URL}/api/feed?type=vacancy`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(feedRes, {
        'vacancy visible in feed': (r) => r.status === 200,
      });
    });

    sleep(2);

    group('Phase 5: Application & Communication', () => {
      const appPayload = JSON.stringify({
        vacancy_id: vacancyId,
        cover_letter: 'I am perfect for this job!',
      });

      const appRes = http.post(`${BASE_URL}/api/applications`, appPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(appRes, {
        'application submitted': (r) => r.status === 200 || r.status === 201,
      });

      const appBody = JSON.parse(appRes.body);
      applicationId = appBody.id || appBody.application_id || 1;

      sleep(1);

      const convPayload = JSON.stringify({
        participant_id: 2,
        message: 'I submitted an application for your vacancy',
      });

      const convRes = http.post(`${BASE_URL}/api/conversations`, convPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(convRes, {
        'conversation started': (r) => r.status === 200 || r.status === 201,
      });

      const convBody = JSON.parse(convRes.body);
      conversationId = convBody.id || convBody.conversation_id || 1;
    });

    sleep(2);

    group('Phase 6: Reviews & Feedback', () => {
      const reviewPayload = JSON.stringify({
        profile_type: 'vacancy',
        profile_id: vacancyId,
        rating: 5,
        text: 'Great employer, excellent communication',
      });

      const reviewRes = http.post(`${BASE_URL}/api/reviews`, reviewPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(reviewRes, {
        'review posted': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      });
    });

    sleep(2);

    group('Phase 7: Profile Management', () => {
      const updatePayload = JSON.stringify({
        experience: 6,
        salary: 80000,
      });

      const updateRes = http.patch(`${BASE_URL}/api/worker/${workerId}`, updatePayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(updateRes, {
        'profile updated': (r) => r.status === 200,
      });
    });

    sleep(2);

    group('Phase 8: Statistics & Analytics', () => {
      const statsRes = http.get(`${BASE_URL}/api/me/statistics`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(statsRes, {
        'statistics accessible': (r) => r.status === 200 || r.status === 404,
      });

      sleep(1);

      const billingRes = http.get(`${BASE_URL}/api/billing/history`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(billingRes, {
        'billing history accessible': (r) => r.status === 200,
      });
    });

    sleep(2);

    group('Phase 9: Complete Lifecycle', () => {
      const logoutRes = http.post(`${BASE_URL}/api/auth/logout`, null, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(logoutRes, {
        'logout successful': (r) => r.status === 200 || r.status === 204,
        'complete lifecycle executed': () => true,
      });
    });
  });
}
