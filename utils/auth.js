// Единый источник токена для k6-сценариев
export function getAuthToken() {
  return __ENV.AUTH_TOKEN || 'test-token-placeholder';
}

export function authHeaders() {
  return {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  };
}
