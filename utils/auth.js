// Единый источник авторизации для k6-сценариев
// Django использует session-based auth (cookie), не JWT

export function getSessionCookie() {
  return __ENV.SESSION_COOKIE || '';
}

export function authHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  
  const cookie = getSessionCookie();
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  
  return headers;
}

export function loginAndGetSession(http, baseUrl, phone, password) {
  // Если SESSION_COOKIE задан через env — используем напрямую (приоритет)
  const envCookie = __ENV.SESSION_COOKIE || '';
  if (envCookie) {
    const match = envCookie.match(/sessionid=([^;]+)/);
    return match ? match[1] : envCookie;
  }

  const payload = JSON.stringify({ phone, password });

  const response = http.post(`${baseUrl}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.status === 200) {
    // Извлекаем sessionid из Set-Cookie
    const setCookie = response.headers['Set-Cookie'] || response.headers['set-cookie'];
    if (setCookie) {
      const match = setCookie.match(/sessionid=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}
