# k6 Testing Suite — HR Platform

Комплексное тестирование HR Platform API (k6 v1.5.0).

## 🎯 Быстрый старт

```bash
# Установка k6: https://k6.io/docs/get-started/installation/

# Запуск всех тестов (46+ тестов)
npm run test:all-sequential

# Только smoke тесты
npm run test:smoke

# Только forms тесты
npm run test:forms

# HTML report
npm run report:html
```

## 🏗️ Структура проекта

```
k6-tests/
├── tests/                      # Все тесты
│   ├── api/                   # 🆕 API endpoint tests (90 тестов)
│   │   ├── auth/             # Авторизация (6)
│   │   ├── favorites/        # Избранное (4)
│   │   ├── messages/         # Сообщения (8)
│   │   ├── monetization/     # Монетизация (21)
│   │   ├── profiles/delete/  # DELETE ops (10)
│   │   ├── reviews/          # Отзывы (4)
│   │   ├── applications/     # Отклики (5)
│   │   ├── subscriptions/    # Подписки (4)
│   │   ├── user/             # User settings (6)
│   │   ├── billing/          # Статистика (4)
│   │   ├── media/            # Загрузка файлов (4)
│   │   ├── search/           # Поиск (6)
│   │   └── feed/             # Feed advanced (4)
│   ├── forms/                 # ✅ Forms CRUD (36 тестов)
│   ├── smoke/                 # ✅ Smoke tests (3 теста)
│   ├── load/                  # ✅ Load tests (3 теста)
│   ├── scenarios/             # ✅ User journeys (4 теста)
│   ├── integration/           # 🆕 E2E tests (6 тестов)
│   ├── security/              # 🆕 Security tests (8 тестов)
│   ├── performance/           # 🆕 Advanced perf (10 тестов)
│   └── chaos/                 # 🆕 Chaos engineering (4 теста)
├── scripts/                    # Автоматизация
│   ├── run-all-tests.ps1     # Master test runner (476 lines)
│   └── generate-html-report.js
├── utils/                      # Helpers
│   ├── auth.js
│   ├── checks.js
│   ├── generators.js
│   └── form-helper.js
├── config/                     # Конфигурации
├── results/                    # Test results (gitignored)
└── TEST_PLAN.md               # 🆕 Master test plan (10 weeks)
```

## 📊 Статус покрытия

| Category        | Tests      | Status      | Coverage |
|-----------------|------------|-------------|----------|
| **Forms CRUD**  | 36/36      | ✅ Complete | 100%     |
| **Smoke**       | 3/3        | ✅ Complete | 100%     |
| **Load**        | 3/3        | ✅ Complete | 100%     |
| **Scenarios**   | 4/4        | ✅ Complete | 100%     |
| **API Tests**   | 0/90       | 🔴 TODO     | 0%       |
| **Integration** | 0/6        | 🔴 TODO     | 0%       |
| **Security**    | 0/8        | 🔴 TODO     | 0%       |
| **Performance** | 3/13       | 🟡 Partial  | 23%      |
| **Chaos**       | 0/4        | 🔴 TODO     | 0%       |
| **TOTAL**       | **46/178** | 🟡 In Progress | **25.8%** |

## 🔥 Приоритеты (по TEST_PLAN.md)

### ✅ COMPLETED
- Forms CRUD testing (36 тестов, 100%)
- Basic smoke tests (3 теста)
- Basic load tests (3 теста)
- User journey scenarios (4 теста)

### 🔴 TODO — Week 1-2 (Security Foundation)
1. **Auth tests** (6 тестов) — login, register, logout, SMS
2. **DELETE operations** (10 тестов) — все profile types
3. **Security tests** (8 тестов) — SQL injection, XSS, CSRF
4. **User settings** (6 тестов) — nickname, avatar, password

### 🔴 TODO — Week 3-4 (Monetization)
5. **Contact purchases** (6 тестов)
6. **Credits/Balance** (5 тестов)
7. **Promotions** (6 тестов) — Boost/Urgent
8. **Subscriptions** (4 тестов)
9. **Billing/Stats** (4 тестов)

### 🔴 TODO — Week 5-6 (Communication)
10. **Favorites** (4 теста)
11. **Messages** (8 тестов)
12. **Reviews** (4 теста)
13. **Applications** (5 тестов)
14. **Media upload** (4 теста)

### 🔴 TODO — Week 7-8 (Search & Integration)
15. **Search/Filtering** (6 тестов)
16. **Feed advanced** (4 теста)
17. **E2E Integration** (6 тестов)

### 🔴 TODO — Week 9-10 (Performance & Resilience)
18. **Performance advanced** (10 тестов) — stress, spike, soak
19. **Chaos engineering** (4 теста)

## 🚀 Запуск тестов

### All Tests
```bash
# Sequential run (рекомендуется)
npm run test:all-sequential

# Full test (с детальным отчетом)
npm run test:full
```

### By Category
```bash
# Smoke
npm run test:smoke

# Load
npm run test:load

# Forms
npm run test:forms

# API (когда будут)
npm run test:api
npm run test:api:auth
npm run test:api:favorites
```

### Specific Test
```bash
k6 run tests/forms/feed-viewer-complete.js
k6 run tests/smoke/api-health.js
```

### Generate HTML Report
```bash
npm run report:html
# Открыть: results/html/report.html
```

## 🔧 Конфигурация

### Environment Variables
```bash
# .env (необязательно)
BASE_URL=http://localhost:8000
TEST_USER_PHONE=+380501234567
TEST_USER_PASSWORD=test123
```

### Thresholds (по умолчанию)
```javascript
thresholds: {
  checks: ['rate>0.95'],              // 95%+ checks pass
  http_req_duration: ['p(95)<500'],  // 95% < 500ms
  http_req_failed: ['rate<0.05']     // < 5% errors
}
```

## 📈 CI/CD

GitHub Actions автоматически запускает:
```
.github/workflows/k6-tests.yml
├── Smoke tests      (быстрая проверка)
├── Forms tests      (регрессия)
├── Regression tests (полная проверка)
└── Load tests       (производительность)
```

**Triggers:**
- Push to main/develop
- Pull requests
- Daily at 02:00 UTC
- Manual dispatch

## 🤝 Утилиты

### `utils/auth.js`
```javascript
import { getAuthToken, authHeaders } from './utils/auth.js';

const token = getAuthToken();
const headers = authHeaders();  // { Cookie: 'sessionid=...' }
```

### `utils/generators.js`
```javascript
import { generatePhone, generateFIO, generateCity } from './utils/generators.js';

const phone = generatePhone();  // +380501234567
const name = generateFIO();     // Іван Петренко
```

### `utils/checks.js`
```javascript
import { standardChecks, authCheck } from './utils/checks.js';

standardChecks(response, 'Expected message');
authCheck(response);
```

## 📖 Документация

| File                                       | Description                          |
|--------------------------------------------|--------------------------------------|
| **[TEST_PLAN.md](TEST_PLAN.md)**           | 🎯 Master план (10 недель, 132 теста) |
| [RECOMMENDATIONS.md](RECOMMENDATIONS.md)   | 17 рекомендаций по тестированию      |
| [QUICK_START.md](QUICK_START.md)          | Быстрый старт для новых разработчиков |
| [tests/api/README.md](tests/api/README.md) | API tests guide                      |
| [../TESTING_COVERAGE_ANALYSIS.md](../TESTING_COVERAGE_ANALYSIS.md) | Анализ покрытия (625 строк) |

## 🛠️ Development

### Create New Test
```bash
# 1. Создать файл
code tests/api/auth/auth-login.test.js

# 2. Использовать шаблон (см. TEST_PLAN.md)

# 3. Запустить
k6 run tests/api/auth/auth-login.test.js

# 4. Commit
git add tests/api/auth/
git commit -m "feat(auth): Add login test"
```

### Update TEST_PLAN.md
```markdown
## Progress Update
✅ auth-login.test.js — DONE (100%)
🔄 favorites-add.test.js — In Progress (60%)
```

## 📞 Support

**Issues:** [GitHub Issues](https://github.com/your-repo/issues)  
**Questions:** См. документацию выше  
**CI/CD:** `.github/workflows/k6-tests.yml`  

---

**Last Updated:** 19.02.2026  
**Version:** 2.0  
**Tests:** 46/178 (25.8%)
\`\`\`
