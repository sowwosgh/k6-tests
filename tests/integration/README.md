# 🔄 Integration Tests (E2E)

End-to-end integration тесты для валидации полных user journeys.

## 📁 Тесты

| Test File                          | Description                                       | Checks | Status |
|------------------------------------|---------------------------------------------------|--------|--------|
| `full-lifecycle.test.js`           | CREATE → FEED → VIEW → UNLOCK → REVIEW → DELETE  | 13/13  | ✅ |
| `feed-update-reaction.test.js`     | PATCH профиля → MaterializedFeed синхронизирован  | 11/11  | ✅ |
| `e2e-worker-journey.test.js`       | Register → Create → Boost → Message              | —      | 🔴 TODO |
| `e2e-employer-journey.test.js`     | Create Vacancy → Applications → Status           | —      | 🔴 TODO |
| `e2e-monetization-flow.test.js`    | Credits → Purchase → Use                         | —      | 🔴 TODO |
| `e2e-subscription-flow.test.js`    | Subscribe → Use → Cancel                         | —      | 🔴 TODO |
| `e2e-contacts-purchase.test.js`    | Full contact purchase flow                       | —      | 🔴 TODO |
| `e2e-full-lifecycle.test.js`       | Complete user lifecycle (legacy)                 | —      | ⚠️ |

**Total:** 0/6 (0%)

## 🎯 Цель

Проверить что все компоненты системы работают вместе корректно:
- API взаимодействует с БД
- Auth flow работает end-to-end
- Monetization flow (credits → purchase → use)
- Communication flow (messages, applications)

## 🚀 Запуск

```bash
# Все E2E тесты
npm run test:integration

# Конкретный сценарий
k6 run tests/integration/e2e-worker-journey.test.js
```

## 🛠️ Шаблон E2E теста

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { generatePhone } from '../../utils/generators.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.95'],
    http_req_duration: ['p(95)<2000']
  }
};

export default function() {
  const BASE_URL = 'https://sowwos.ru';
  let sessionid;
  
  group('Step 1: Register User', () => {
    // Registration logic
  });
  
  group('Step 2: Create Profile', () => {
    // Profile creation
  });
  
  group('Step 3: Perform Action', () => {
    // Main action
  });
  
  group('Step 4: Verify Result', () => {
    // Verification
  });
}
```

## 📊 Acceptance Criteria

Каждый E2E тест должен:
- ✅ Покрывать полный user journey (3-5 шагов)
- ✅ Проверять что данные корректно сохраняются
- ✅ Проверять что состояние меняется ожидаемо
- ✅ Cleanup после теста (удаление тестовых данных)
- ✅ Проходить < 10 минут

## 🔗 Ссылки

- [Master Test Plan](../../TEST_PLAN.md)
- [API Tests](../api/README.md)
