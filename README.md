# SOWWOS k6 Test Suite

**Инструмент:** k6 v1.5.0
**Продакшн:** https://sowwos.ru

---

## Быстрый старт

```bash
# Smoke-тест (проверка живости)
k6 run tests/smoke/production-smoke.js

# Нагрузочный тест (10 VU, 5 мин)
k6 run tests/load/feed-load.js

# Стресс-тест (до 200 VU, 9 мин)
k6 run tests/performance/stress-quick.js
```

Результаты последних тестов → см. [RESULTS.md](RESULTS.md)

---

## Структура тестов

```
tests/
├── smoke/          # Проверка живости продакшна (запуск после каждого деплоя)
│   └── production-smoke.js   ← главный smoke-тест
├── load/           # Нагрузочные тесты (10-20 VU)
├── performance/    # Стресс/spike/soak тесты
├── forms/          # CRUD тесты всех форм (10 типов профилей)
├── scenarios/      # User journey сценарии
├── api/            # Тесты API endpoint'ов
└── integration/    # E2E тесты
```

---

## Автоматический запуск

Smoke-тест запускается **автоматически** после каждого деплоя через `.\scripts\deploy-beget.ps1`.

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `BASE_URL` | `https://sowwos.ru` | URL сервера |
| `SESSION_COOKIE` | — | Для авторизованных тестов |
| `AUTH_TOKEN` | — | Bearer token (опционально) |
