import { check } from 'k6';

export function checkStatus(res, name) {
  return check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} has data`]: (r) => r.body && r.body.length > 2
  });
}

export function checkJsonArray(res, name) {
  return check(res, {
    [`${name} is JSON array`]: (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    }
  });
}
