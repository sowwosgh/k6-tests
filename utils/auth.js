// Заглушка для будущей авторизации
export function getAuthToken() {
  // TODO: Реализовать когда будет auth API
  return 'test-token-placeholder';
}

export function authHeaders() {
  return {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  };
}
