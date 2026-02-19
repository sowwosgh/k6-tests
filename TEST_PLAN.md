# 🎯 MASTER TEST PLAN — HR PLATFORM

**Версия:** 1.0  
**Дата создания:** 19.02.2026  
**Автор:** GitHub Copilot (Claude Sonnet 4.5)  
**Статус:** В разработке  

---

## 📊 EXECUTIVE SUMMARY

**Цель:** Обеспечить 100% покрытие API тестами для HR платформы  
**Текущее покрытие:** 46 тестов (Forms CRUD + Smoke + Load)  
**Необходимо добавить:** 132 теста в 22 группах  
**Общее время:** 168-224 часа (3-4 месяца при 10-15ч/неделю)  

---

## 🗂️ СТРУКТУРА ПРОЕКТА

```
k6-tests/
├── tests/
│   ├── api/                    # 🆕 API endpoint tests
│   │   ├── auth/              # Авторизация (6 тестов)
│   │   ├── favorites/         # Избранное (4 теста)
│   │   ├── messages/          # Сообщения (8 тестов)
│   │   ├── monetization/      # Монетизация
│   │   │   ├── contacts/     # Покупка контактов (6 тестов)
│   │   │   ├── credits/      # Кредиты/баланс (5 тестов)
│   │   │   └── promotions/   # Boost/Urgent (6 тестов)
│   │   ├── profiles/          # Операции с профилями
│   │   │   └── delete/       # DELETE operations (10 тестов)
│   │   ├── reviews/           # Отзывы (4 теста)
│   │   ├── applications/      # Отклики (5 тестов)
│   │   ├── subscriptions/     # Подписки (4 теста)
│   │   ├── user/              # User settings (6 тестов)
│   │   ├── billing/           # Биллинг/статистика (4 теста)
│   │   ├── media/             # Загрузка файлов (4 теста)
│   │   ├── search/            # Поиск/фильтры (6 тестов)
│   │   └── feed/              # Feed advanced (4 теста)
│   ├── forms/                  # ✅ Forms CRUD (36 тестов)
│   ├── smoke/                  # ✅ Smoke tests (3 теста)
│   ├── load/                   # ✅ Load tests (3 теста)
│   ├── scenarios/              # ✅ User journeys (4 теста)
│   ├── integration/            # 🆕 E2E integration (6 тестов)
│   ├── security/               # 🆕 Security tests (8 тестов)
│   └── performance/            # 🆕 Advanced perf (10 тестов)
├── utils/                      # ✅ Helper functions
├── scripts/                    # ✅ Automation scripts
├── config/                     # ✅ Configuration
├── results/                    # 🆕 Test results (gitignored)
└── docs/                       # 🆕 Documentation
```

---

## 🔥 PRIORITY 1: КРИТИЧЕСКИЕ ТЕСТЫ (100 тестов)

### 📅 WEEK 1-2: Security & Auth (40 часов)

#### 1. Авторизация/Аутентификация (6 тестов, 12ч)
**Директория:** `tests/api/auth/`  
**Файлы:**
- `auth-login.test.js` — успешная авторизация, wrong password, wrong phone
- `auth-register.test.js` — регистрация нового пользователя
- `auth-logout.test.js` — выход из системы
- `auth-me.test.js` — GET /api/auth/me (authorized/anonymous)
- `sms-verification.test.js` — отправка/проверка SMS кода
- `rate-limiting.test.js` — защита от спама

**Endpoints:**
```javascript
POST /api/auth/login      // ✅ частично покрыт
POST /api/auth/register   // ❌
POST /api/auth/logout     // ❌
GET  /api/auth/me         // ❌
POST /api/sms/send-code   // ❌
POST /api/sms/verify-code // ❌
```

**Acceptance Criteria:**
- [x] Успешный login возвращает sessionid cookie
- [x] Неправильный пароль возвращает 401
- [x] Регистрация создает нового пользователя
- [x] SMS verification работает с mock кодами
- [x] Rate limiting блокирует > 5 запросов/мин

**Приоритет:** 🔥🔥🔥 Критический  
**Зависимости:** Нет  

---

#### 2. DELETE Operations (10 тестов, 10ч)
**Директория:** `tests/api/profiles/delete/`  
**Файлы:**
- `delete-worker.test.js`
- `delete-brigade.test.js`
- `delete-contractor.test.js`
- `delete-customer.test.js`
- `delete-employer.test.js`
- `delete-vacancy.test.js`
- `delete-resume.test.js`
- `delete-order.test.js`
- `delete-tender.test.js`
- `delete-review.test.js`

**Endpoints:**
```javascript
DELETE /api/worker/{id}
DELETE /api/brigade/{id}
DELETE /api/contractor/{id}
DELETE /api/customer/{id}
DELETE /api/employer/{id}
DELETE /api/vacancy/{id}
DELETE /api/resume/{id}
DELETE /api/orders/{id}      // ⚠️ проверить endpoint
DELETE /api/tenders/{id}     // ⚠️ проверить endpoint
DELETE /api/reviews/{id}
```

**Acceptance Criteria:**
- [x] Удаление своего профиля → 200
- [x] Попытка удалить чужой → 403
- [x] Удаление несуществующего → 404
- [x] Cascade delete (связанные данные)
- [x] Без авторизации → 401

**Приоритет:** 🔥🔥🔥 Критический (безопасность)  
**Зависимости:** Auth tests  

---

#### 3. Security Tests (8 тестов, 14ч)
**Директория:** `tests/security/`  
**Файлы:**
- `sql-injection.test.js`
- `xss-protection.test.js`
- `csrf-protection.test.js`
- `rate-limiting.test.js`
- `authorization-bypass.test.js`
- `password-requirements.test.js`
- `session-hijacking.test.js`
- `file-upload-security.test.js`

**Acceptance Criteria:**
- [x] SQL injection блокируется
- [x] XSS attempts sanitized
- [x] CSRF tokens validated
- [x] Rate limits enforced
- [x] Authorization checks работают

**Приоритет:** 🔥🔥🔥 Критический  
**Зависимости:** Auth tests  

---

#### 4. User Settings (6 тестов, 8ч)
**Директория:** `tests/api/user/`  
**Файлы:**
- `user-nickname.test.js` — проверка/изменение nickname
- `user-avatar.test.js` — загрузка/удаление аватара
- `user-password.test.js` — смена пароля
- `user-profiles-list.test.js` — список своих профилей

**Endpoints:**
```javascript
GET    /api/user/check-nickname
PATCH  /api/user/nickname
POST   /api/user/avatar
DELETE /api/user/avatar
POST   /api/user/change-password
GET    /api/profiles
```

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Auth tests  

---

### 📅 WEEK 3-4: Monetization (40 часов)

#### 5. Покупка контактов (6 тестов, 12ч)
**Директория:** `tests/api/monetization/contacts/`  
**Файлы:**
- `contacts-packages.test.js` — получение пакетов
- `contacts-check-access.test.js` — проверка доступа
- `contacts-purchase.test.js` — покупка контактов
- `contacts-purchase-no-balance.test.js` — покупка без баланса
- `contacts-history.test.js` — история покупок
- `contacts-idempotency.test.js` — повторная покупка

**Endpoints:**
```javascript
GET  /api/contact-packages
GET  /api/contacts/check-access/{type}/{id}
POST /api/purchase-contact
POST /api/payments/purchase-package
GET  /api/contacts/history
```

**Acceptance Criteria:**
- [x] Packages list → 200, array
- [x] Check access → {has_access: bool, unlock_price: N}
- [x] Purchase with balance → 200, unlocked contacts
- [x] Purchase without balance → 402
- [x] Idempotency: повторная покупка → 200 (already purchased)

**Приоритет:** 🔥🔥🔥 Критический (бизнес-логика)  
**Зависимости:** Auth + Credits  

---

#### 6. Кредиты/Баланс (5 тестов, 10ч)
**Директория:** `tests/api/monetization/credits/`  
**Файлы:**
- `credits-balance.test.js` — получение баланса
- `credits-packages.test.js` — пакеты пополнения
- `credits-payment-create.test.js` — создание платежа
- `credits-history.test.js` — история пополнений
- `credits-webhook.test.js` — webhook обработка

**Endpoints:**
```javascript
GET  /api/user/credits
GET  /api/user/balance
GET  /api/payments/packages
POST /api/payments/create
GET  /api/payments/history
POST /api/payments/webhook
```

**Acceptance Criteria:**
- [x] Balance → {credits: N}
- [x] Packages → 200, array
- [x] Create payment → {payment_url, order_id}
- [x] Webhook success → credits increased
- [x] Webhook fail → credits unchanged

**Приоритет:** 🔥🔥🔥 Критический  
**Зависимости:** Auth  

---

#### 7. Promotions (Boost/Urgent) (6 тестов, 8ч)
**Директория:** `tests/api/monetization/promotions/`  
**Файлы:**
- `boost-packages.test.js` — пакеты поднятия
- `boost-purchase.test.js` — покупка boost
- `boost-active.test.js` — активные boosts
- `urgent-purchase.test.js` — покупка срочности
- `boost-expiration.test.js` — проверка срока

**Endpoints:**
```javascript
GET  /api/boost/packages
GET  /api/boost/pricing
POST /api/boost/purchase
GET  /api/boost/active
POST /api/urgent/purchase
GET  /api/urgent/pricing
```

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Auth + Credits  

---

#### 8. Подписки (4 теста, 6ч)
**Директория:** `tests/api/subscriptions/`  
**Файлы:**
- `subscriptions-plans.test.js`
- `subscriptions-current.test.js`
- `subscriptions-subscribe.test.js`
- `subscriptions-cancel.test.js`

**Endpoints:**
```javascript
GET  /api/subscriptions/plans
GET  /api/subscriptions/current
POST /api/subscriptions/subscribe
POST /api/subscriptions/cancel
```

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Auth  

---

#### 9. Billing/Statistics (4 теста, 6ч)
**Директория:** `tests/api/billing/`  
**Файлы:**
- `billing-stats.test.js`
- `billing-profile-stats.test.js`
- `billing-history.test.js`
- `billing-detailed.test.js`

**Endpoints:**
```javascript
GET /api/stats
GET /api/profiles/{type}/{id}/statistics
GET /api/billing/history
```

**Приоритет:** 🔥 Средний  
**Зависимости:** Auth  

---

### 📅 WEEK 5-6: Communication (40 часов)

#### 10. Избранное (4 теста, 6ч)
**Директория:** `tests/api/favorites/`  
**Файлы:**
- `favorites-add.test.js`
- `favorites-remove.test.js`
- `favorites-list.test.js`
- `favorites-check.test.js`

**Endpoints:**
```javascript
POST   /api/favorites
DELETE /api/favorites/{type}/{id}
GET    /api/favorites
GET    /api/favorites/check
```

**Acceptance Criteria:**
- [x] Add → 200
- [x] Remove → 200
- [x] List → 200, array with enrichment
- [x] Check → {is_favorite: bool}
- [x] Without auth → 401
- [x] Idempotency (duplicate add)

**Приоритет:** 🔥🔥🔥 Критический  
**Зависимости:** Auth  

---

#### 11. Сообщения/Диалоги (8 тестов, 14ч)
**Директория:** `tests/api/messages/`  
**Файлы:**
- `conversations-start.test.js`
- `conversations-list.test.js`
- `conversations-messages.test.js`
- `conversations-send-message.test.js`
- `conversations-unread-count.test.js`
- `conversations-access-control.test.js`
- `messages-pagination.test.js`
- `messages-legacy.test.js`

**Endpoints:**
```javascript
POST /api/conversations/start
GET  /api/conversations
GET  /api/conversations/{id}/messages
POST /api/conversations/{id}/messages
GET  /api/conversations/unread-count
GET  /api/messages              # legacy
POST /api/messages              # legacy
```

**Acceptance Criteria:**
- [x] Start conversation → 200, conversation_id
- [x] Send message → 200
- [x] List conversations → 200, array
- [x] Get messages → 200, array with pagination
- [x] Unread count → {unread_count: N}
- [x] Access control: чужие диалоги → 403
- [x] Without auth → 401

**Приоритет:** 🔥🔥🔥 Критический  
**Зависимости:** Auth  

---

#### 12. Отзывы (4 теста, 6ч)
**Директория:** `tests/api/reviews/`  
**Файлы:**
- `reviews-create.test.js`
- `reviews-list.test.js`
- `reviews-delete.test.js`
- `reviews-duplicate-prevention.test.js`

**Endpoints:**
```javascript
POST   /api/reviews
GET    /api/reviews?profile_type=&profile_id=
DELETE /api/reviews/{id}
```

**Priоритет:** 🔥🔥 Высокий  
**Зависимости:** Auth  

---

#### 13. Applications (Отклики) (5 тестов, 6ч)
**Директория:** `tests/api/applications/`  
**Файлы:**
- `applications-apply.test.js`
- `applications-count.test.js`
- `applications-list.test.js`
- `applications-status.test.js`
- `applications-duplicate.test.js`

**Endpoints:**
```javascript
POST  /api/apply
GET   /api/applications/count
GET   /api/applications
PATCH /api/applications/{id}/status
```

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Auth  

---

#### 14. Media Upload (4 теста, 6ч)
**Директория:** `tests/api/media/`  
**Файлы:**
- `media-avatar.test.js`
- `media-portfolio.test.js`
- `media-validation.test.js`
- `media-size-limits.test.js`

**Endpoints:**
```javascript
POST /api/worker/{id}/avatar
POST /api/worker/{id}/portfolio
POST /api/brigade/{id}/avatar
POST /api/contractor/{id}/avatar
```

**Приоритет:** 🔥 Средний  
**Зависимости:** Auth  

---

### 📅 WEEK 7-8: Search & Integration (40 часов)

#### 15. Search & Filtering (6 тестов, 8ч)
**Директория:** `tests/api/search/`  
**Файлы:**
- `search-by-city.test.js`
- `search-by-specialization.test.js`
- `search-salary-filter.test.js`
- `search-experience-filter.test.js`
- `search-sorting.test.js`
- `search-pagination.test.js`

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Нет  

---

#### 16. Feed API Advanced (4 теста, 6ч)
**Директория:** `tests/api/feed/`  
**Файлы:**
- `feed-filtering.test.js`
- `feed-my-feed.test.js`
- `feed-paywall.test.js`
- `feed-favorites-flag.test.js`

**Endpoints:**
```javascript
GET /api/feed            # ✅ базовая проверка есть
GET /api/my-feed
```

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Auth  

---

#### 17. E2E Integration (6 тестов, 16ч)
**Директория:** `tests/integration/`  
**Файлы:**
- `e2e-worker-journey.test.js` — Register → Create → Boost → Message
- `e2e-employer-journey.test.js` — Create Vacancy → Applications → Status
- `e2e-monetization-flow.test.js` — Credits → Purchase → Use
- `e2e-subscription-flow.test.js` — Subscribe → Use → Cancel
- `e2e-contacts-purchase.test.js` — Full contact purchase flow
- `e2e-full-lifecycle.test.js` — Complete user lifecycle

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Все предыдущие  

---

## 🟢 PRIORITY 2: ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ (32 теста)

### 📅 WEEK 9-10: Performance & Resilience (48 часов)

#### 18. Performance Tests Advanced (10 тестов, 20ч)
**Директория:** `tests/performance/`  
**Файлы:**
- `stress-test.test.js` — найти breaking point
- `spike-test.test.js` — резкие всплески
- `soak-test.test.js` — длительная нагрузка (1-3ч)
- `concurrent-users.test.js` — 100+ VUs
- `db-connection-pool.test.js`
- `memory-leak.test.js`
- `cache-effectiveness.test.js`
- `static-files-perf.test.js`
- `api-degradation.test.js`
- `websocket-load.test.js` (если есть)

**Приоритет:** 🔥🔥 Высокий  
**Зависимости:** Нет  

---

#### 19. Chaos Engineering (4 теста, 8ч)
**Директория:** `tests/chaos/`  
**Файлы:**
- `chaos-random-errors.test.js`
- `chaos-slow-responses.test.js`
- `chaos-db-unavailable.test.js`
- `chaos-external-api-fail.test.js`

**Приоритет:** 🔥 Средний  
**Зависимости:** Нет  

---

#### 20. Mocking & Fixtures (4 теста, 6ч)
**Директория:** `tests/mocks/`  
**Файлы:**
- `mock-sms-service.test.js`
- `mock-payment-gateway.test.js`
- `fixtures-generation.test.js`
- `database-cleanup.test.js`

**Приоритет:** 🔥 Средний  
**Зависимости:** Нет  

---

## 📊 TRACKING & METRICS

### Progress Tracking
```
Total Tests: 178 (46 existing + 132 new)
Completed: 46 (25.8%)
In Progress: 0 (0%)
TODO: 132 (74.2%)

By Priority:
🔥 Critical: 100 tests (75.7%)
🟡 High: 32 tests (24.3%)
```

### Coverage Metrics
```
✅ Forms CRUD: 100% (36/36)
✅ Smoke: 100% (3/3)
✅ Load: 100% (3/3)
✅ Scenarios Basic: 100% (4/4)
❌ Auth: 0% (0/6)
❌ Monetization: 0% (0/21)
❌ Communication: 0% (0/21)
❌ Security: 0% (0/8)
❌ Integration: 0% (0/6)
❌ Performance: 33% (3/13 — basic only)
```

---

## 🎯 MILESTONE DEFINITIONS

### Milestone 1: Security Foundation (Week 1-2)
**Goal:** Ensure platform security basics  
**Tests:** 24 tests (Auth + DELETE + Security + User)  
**Acceptance:** All critical security tests pass  

### Milestone 2: Monetization Core (Week 3-4)
**Goal:** Validate business logic  
**Tests:** 25 tests (Contacts + Credits + Promotions + Subscriptions + Billing)  
**Acceptance:** Full monetization flow works  

### Milestone 3: Communication Layer (Week 5-6)
**Goal:** Social features validation  
**Tests:** 25 tests (Favorites + Messages + Reviews + Applications + Media)  
**Acceptance:** User interactions work flawlessly  

### Milestone 4: Integration & Search (Week 7-8)
**Goal:** End-to-end validation  
**Tests:** 16 tests (Search + Feed + E2E)  
**Acceptance:** Complete user journeys pass  

### Milestone 5: Performance & Resilience (Week 9-10)
**Goal:** System stability under load  
**Tests:** 18 tests (Performance + Chaos + Mocks)  
**Acceptance:** System handles expected load  

---

## 🛠️ IMPLEMENTATION GUIDE

### Creating New Test
```bash
# 1. Create test file
code tests/api/auth/auth-login.test.js

# 2. Use template structure
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
  group('Auth Login', () => {
    // Test implementation
  });
}

# 3. Run test
npm run test:api:auth:login

# 4. Commit
git add tests/api/auth/auth-login.test.js
git commit -m "feat: Add auth login test"
```

### Test Naming Convention
```
{domain}-{action}.test.js

Examples:
- auth-login.test.js
- favorites-add.test.js
- conversations-start.test.js
- credits-balance.test.js
```

### NPM Scripts Pattern
```json
{
  "test:api:{domain}": "k6 run tests/api/{domain}/*.test.js",
  "test:api:{domain}:{action}": "k6 run tests/api/{domain}/{action}.test.js"
}
```

---

## 📈 REPORTING

### Daily Status Update
```markdown
## Testing Progress — {Date}

**Completed Today:** 3 tests
- ✅ auth-login.test.js (100%)
- ✅ auth-register.test.js (100%)
- ✅ auth-logout.test.js (100%)

**In Progress:** 2 tests
- 🔄 favorites-add.test.js (60%)
- 🔄 favorites-remove.test.js (40%)

**Blockers:** None

**Next:** favorites-list.test.js, favorites-check.test.js
```

### Weekly Summary
```markdown
## Week Summary — Week {N}

**Tests Completed:** 12/15 (80%)
**Total Coverage:** 58/178 (32.6%)
**Next Milestone:** Security Foundation (85% complete)

**Highlights:**
- ✅ All auth tests passing
- ✅ DELETE operations secured
- 🔄 Security tests in progress

**Issues:** None
```

---

## 🚀 QUICK START

### Run Existing Tests
```bash
# All tests
npm run test:all-sequential

# Only new API tests
npm run test:api

# Specific domain
npm run test:api:auth
npm run test:api:favorites

# Generate report
npm run report:html
```

### Create First New Test
```bash
# 1. Pull latest
git pull origin main

# 2. Create auth-login test
code tests/api/auth/auth-login.test.js

# 3. Implement (see template above)

# 4. Run
k6 run tests/api/auth/auth-login.test.js

# 5. Commit
git add tests/api/auth/
git commit -m "feat(auth): Add login test"
git push
```

---

## 📞 SUPPORT

**Questions?** Create issue in GitHub  
**Documentation:** See [RECOMMENDATIONS.md](RECOMMENDATIONS.md)  
**Coverage Analysis:** See [../TESTING_COVERAGE_ANALYSIS.md](../TESTING_COVERAGE_ANALYSIS.md)  

---

**Next Review Date:** 26.02.2026  
**Last Updated:** 19.02.2026  
**Version:** 1.0
