# 🔒 Security Tests

Тесты безопасности для проверки защиты от распространенных атак.

## 📁 Тесты

| Test File                       | Description                    | Priority | Status |
|---------------------------------|--------------------------------|----------|--------|
| `sql-injection.test.js`         | SQL injection protection       | 🔥 Critical | 🔴 TODO |
| `xss-protection.test.js`        | XSS attack prevention          | 🔥 Critical | 🔴 TODO |
| `csrf-protection.test.js`       | CSRF token validation          | 🔥 Critical | 🔴 TODO |
| `rate-limiting.test.js`         | Rate limit enforcement         | 🔥 Critical | 🔴 TODO |
| `authorization-bypass.test.js`  | Authorization checks           | 🔥 Critical | 🔴 TODO |
| `password-requirements.test.js` | Password strength validation   | 🔥 High     | 🔴 TODO |
| `session-hijacking.test.js`     | Session security               | 🔥 High     | 🔴 TODO |
| `file-upload-security.test.js`  | File upload validation         | 🔥 High     | 🔴 TODO |

**Total:** 0/8 (0%)

## 🎯 Цель

Обеспечить безопасность платформы от:
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Brute-force атак
- Unauthorized access
- Malicious file uploads

## 🚀 Запуск

```bash
# Все security тесты
npm run test:security

# Конкретный тест
k6 run tests/security/sql-injection.test.js
```

## 🛠️ Шаблон Security теста

```javascript
import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],  // Security tests must pass 100%
    http_req_failed: ['rate<0.01']
  }
};

export default function() {
  const BASE_URL = 'https://sowwos.ru';
  
  group('SQL Injection Attempts', () => {
    const payloads = [
      "' OR '1'='1",
      "1'; DROP TABLE users--",
      "admin'--",
      "' UNION SELECT NULL--"
    ];
    
    payloads.forEach(payload => {
      const response = http.get(`${BASE_URL}/api/endpoint?param=${payload}`);
      
      check(response, {
        'should not return 500': (r) => r.status !== 500,
        'should not leak DB error': (r) => !r.body.includes('SQL'),
        'should sanitize input': (r) => r.status === 400 || r.status === 403
      });
    });
  });
}
```

## 📊 Acceptance Criteria

- ✅ Все SQL injection payloads блокируются
- ✅ XSS attempts sanitized
- ✅ CSRF tokens validated
- ✅ Rate limits работают (5 req/min)
- ✅ Authorization checks на всех endpoints
- ✅ Passwords требуют минимум 8 символов
- ✅ Sessions корректно invalidated
- ✅ File uploads проверяются (type, size, content)

## 🔗 Ссылки

- [Master Test Plan](../../TEST_PLAN.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
