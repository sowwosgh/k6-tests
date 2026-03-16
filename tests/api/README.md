# 🌐 API Tests

Покрытие API endpoints на платформе HR.

## 📁 Структура

```
api/
├── auth/              # Авторизация/аутентификация (6 тестов)
├── favorites/         # Избранное (4 теста)
├── messages/          # Сообщения/диалоги (8 тестов)
├── monetization/      # Монетизация
│   ├── contacts/      # Покупка контактов (6 тестов)
│   ├── credits/       # Кредиты/баланс (5 тестов)
│   └── promotions/    # Boost/Urgent (6 тестов)
├── profiles/          # Операции с профилями
│   └── delete/        # DELETE operations (10 тестов)
├── reviews/           # Отзывы (4 теста)
├── applications/      # Отклики (5 тестов)
├── subscriptions/     # Подписки (4 теста)
├── user/              # User settings (6 тестов)
├── billing/           # Биллинг/статистика (4 теста)
├── media/             # Загрузка файлов (4 теста)
├── search/            # Поиск/фильтры (6 тестов)
└── feed/              # Feed advanced (4 теста)
```

## 🚀 Запуск

```bash
# Все API тесты
npm run test:api

# Конкретная группа
npm run test:api:auth
npm run test:api:favorites
npm run test:api:monetization

# Конкретный тест
k6 run tests/api/auth/auth-login.test.js
```

## 📊 Статус покрытия

| Domain          | Tests | Status | Priority |
|-----------------|-------|--------|----------|
| Auth            | 0/6   | 🔴 TODO | 🔥 Critical |
| Favorites       | 0/4   | 🔴 TODO | 🔥 Critical |
| Messages        | 0/8   | 🔴 TODO | 🔥 Critical |
| Monetization    | 0/21  | 🔴 TODO | 🔥 Critical |
| DELETE Ops      | 0/10  | 🔴 TODO | 🔥 Critical |
| Reviews         | 0/4   | 🔴 TODO | 🔥 High |
| Applications    | 0/5   | 🔴 TODO | 🔥 High |
| Subscriptions   | 0/4   | 🔴 TODO | 🔥 High |
| User Settings   | 0/6   | 🔴 TODO | 🔥 High |
| Billing/Stats   | 0/4   | 🔴 TODO | 🔥 Medium |
| Media Upload    | 0/4   | 🔴 TODO | 🔥 Medium |
| Search          | 0/6   | 🔴 TODO | 🔥 High |
| Feed            | 0/4   | 🔴 TODO | 🔥 High |

**Total:** 0/90 (0%)

## 🛠️ Шаблон теста

```javascript
import http from 'k6/http';
import { check, group } from 'k6';
import { authHeaders } from '../../../utils/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.95'],
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05']
  }
};

export default function() {
  const BASE_URL = 'https://sowwos.ru';
  
  group('Test Name', () => {
    const response = http.get(`${BASE_URL}/api/endpoint`, {
      headers: authHeaders()
    });
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'has expected data': (r) => {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('expected_field');
      }
    });
  });
}
```

## 📝 Naming Convention

- **Format:** `{domain}-{action}.test.js`
- **Examples:**
  - `auth-login.test.js`
  - `favorites-add.test.js`
  - `messages-send.test.js`
  - `credits-balance.test.js`

## 🔗 Ссылки

- [Master Test Plan](../../TEST_PLAN.md)
- [Testing Coverage Analysis](../../../TESTING_COVERAGE_ANALYSIS.md)
- [Recommendations](../../RECOMMENDATIONS.md)
