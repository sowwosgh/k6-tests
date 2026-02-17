# 🧪 Forms Testing Suite

Комплексное тестирование форм профилей согласно архитектуре HR Platform.

## 📋 Архитектура (3 сценария)

### 1️⃣ **QuickCreateFormRule** — Создание профилей
**Правое окно "Быстрое создание"**
- POST `/api/worker` — 👷 Специалист
- POST `/api/brigade` — 👥 Бригада
- POST `/api/contractor` — 🏢 Подрядчик
- POST `/api/customer` — 👑 Заказчик
- POST `/api/vacancy` — 🏢 Вакансия
- POST `/api/resume` — 👤 Резюме
- POST `/api/order` — 📦 Заказ
- POST `/api/tender` — 🏆 Тендер

### 2️⃣ **MyProfilesFormRule** — Мои профили
**Левое меню "Мои профили" (просмотр/редактирование)**
- GET/PATCH `/api/worker/{id}` — 👷 Специалист
- GET/PATCH `/api/brigade/{id}` — 👥 Бригада
- GET/PATCH `/api/contractor/{id}` — 🏢 Подрядчик
- GET/PATCH `/api/customer/{id}` — 👑 Заказчик
- GET/PATCH `/api/employer/{id}` — 💼 Работодатель
- GET/PATCH `/api/company/{id}` — 🏢 Компания

### 3️⃣ **FeedViewerRule** — Просмотр из ленты
**Центральный экран с paywall контактов**
- GET `/api/{type}/{id}` с проверкой `is_masked`, `unlock_price`

---

## 🔧 Утилиты (8 проверок)

### `utils/form-helper.js`

1. ✅ **checkFormOpened** — форма открылась (status 200/201)
2. ✅ **checkRequiredFields** — все обязательные поля присутствуют
3. ✅ **checkNoDuplicateFields** — нет дублирующих полей
4. ✅ **checkEditOperation** — редактирование (PATCH)
5. ✅ **checkViewOperation** — просмотр (GET)
6. ✅ **checkDeleteOperation** — удаление (DELETE + ALLOW_DELETE flag)
7. ✅ **checkUIStructure** — структура для UI
8. ✅ **checkDictionaryData** — справочники (autocomplete)

**Дополнительные:**
- `checkCreateSuccess` — успешное создание
- `checkContactsPaywall` — paywall контактов (masked/unmasked)
- `checkProfilesList` — список профилей
- `extractProfileId` — извлечь ID из ответа

---

## 📁 Структура файлов

```
tests/forms/
├── worker-create.js       # POST /api/worker
├── worker-read.js         # GET /api/worker/{id}
├── worker-update.js       # PATCH /api/worker/{id}
├── brigade-create.js      # TODO
├── brigade-read.js        # TODO
├── brigade-update.js      # TODO
├── contractor-create.js   # TODO
├── contractor-read.js     # TODO
├── contractor-update.js   # TODO
├── customer-create.js     # TODO
├── customer-read.js       # TODO
├── customer-update.js     # TODO
└── all-forms.js           # Запуск всех тестов
```

---

## 🚀 Запуск тестов

### Все формы
```bash
npm run test:forms
# или
k6 run tests/forms/all-forms.js
```

### Worker (специалист)
```bash
# Все операции worker
npm run test:forms:worker

# Отдельные операции
npm run test:forms:worker:create
npm run test:forms:worker:read
npm run test:forms:worker:update
```

### Smoke test (быстрая проверка)
```bash
npm run test:forms:smoke
```

### Load test (нагрузочное тестирование)
```bash
npm run test:forms:load
```

---

## 🔐 Переменные окружения

```bash
# URL backend
export BASE_URL=http://127.0.0.1:8000
# или
export BASE_URL=https://staging.sowwos.com

# Auth token
export AUTH_TOKEN=your-jwt-token-here

# ID для тестирования read/update
export WORKER_ID=1
export BRIGADE_ID=1

# Флаг владения профилем (для paywall)
export IS_OWN_PROFILE=true
```

### Пример запуска с переменными
```bash
BASE_URL=http://127.0.0.1:8000 WORKER_ID=5 k6 run tests/forms/worker-read.js
```

---

## 📊 Метрики успеха

### Thresholds (пороги)
- `http_req_duration: p(95) < 2000ms` — 95% запросов быстрее 2 сек
- `checks: rate > 0.95` — минимум 95% проверок пройдено
- `http_req_failed: rate < 0.1` — менее 10% ошибок

### Ожидаемые результаты
```
✅ Checks:         ✅ 100% passed
✅ Failed:         ✅ 0% requests
✅ Avg Duration:   450ms
```

---

## 🧹 Чистка попутно (Вариант А)

При работе с тестами **удаляем мусор**:

### ❌ Удалить:
```javascript
// TODO: fix this (если уже исправлено)
// console.log('debug')
// debugger
// const unused = 'something'
```

### ✅ Заменить:
```javascript
// ❌ Плохо
const data = getStuff()
function doIt(x, y) { ... }

// ✅ Хорошо
const userData = getUserProfile()
function calculateTotal(subtotal, tax) { ... }
```

### Коммиты:
```bash
git commit -m "refactor: clean up unused variables in worker-create.js"
git commit -m "refactor: rename ambiguous function names in form-helper"
```

---

## 📝 План развития (НЕДЕЛЯ 1)

### День 1-2 ✅
- [x] Создать структуру `tests/forms/`
- [x] Создать `utils/form-helper.js` с 8 проверками
- [x] Создать worker тесты (create/read/update)
- [x] Обновить `package.json` скрипты

### День 3-4 (TODO)
- [ ] Создать brigade тесты
- [ ] Создать contractor тесты
- [ ] Создать customer тесты

### День 5-6 (TODO)
- [ ] Создать employer/company тесты
- [ ] Создать vacancy/resume/order/tender тесты
- [ ] Добавить dictionary тесты (справочники)

### День 7 (TODO)
- [ ] Запустить все тесты на staging
- [ ] Документировать результаты
- [ ] Подготовить отчет по Неделе 1

---

## 🔗 Ссылки

- [CLEANUP_PLAN.md](../CLEANUP_PLAN.md) — план чистки на 4 недели
- [frozenArchitectureRules.js](../../frontend/src/config/frozenArchitectureRules.js) — правила архитектуры
- [profileFormConfigs.js](../../frontend/src/config/profileFormConfigs.js) — конфигурации форм

---

**Автор:** GitHub Copilot  
**Дата создания:** 17 февраля 2026  
**Версия:** 1.0
