import { check } from 'k6';

export function isJsonResponse(res) {
  const contentType = res.headers['Content-Type'] || res.headers['content-type'] || '';
  return contentType.includes('application/json');
}

export function parseJsonSafe(res) {
  if (!isJsonResponse(res)) {
    return null;
  }

  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

export function checkStatus(res, name) {
  return check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} has data`]: (r) => r.body && r.body.length > 2
  });
}

export function checkJsonArray(res, name) {
  const parsedBody = parseJsonSafe(res);

  return check(res, {
    [`${name} content-type json`]: () => isJsonResponse(res),
    [`${name} is JSON array`]: () => Array.isArray(parsedBody)
  });
}
