# SOWWOS — Результаты нагрузочного тестирования

**Последнее обновление:** 16 марта 2026
**Инструмент:** k6 v1.5.0
**Цель:** https://sowwos.ru (продакшн)

---

## Итоговая оценка: ✅ ОТЛИЧНО

Сервер уверенно держит **200 одновременных пользователей** без единой ошибки.
Для текущего этапа проекта (старт) — запас прочности достаточный.

---

## Статус всех тестов (16.03.2026)

| Тест | VU | Результат | Ошибок | P95 |
|---|---|---|---|---|
| `smoke/production-smoke.js` | 1 | ✅ 9/9 | 0% | 412ms |
| `smoke/api-health.js` | 1 | ✅ 100% | 0% | 270ms |
| `smoke/cards-smoke.js` | 1 | ✅ 100% | 0% | 315ms |
| `smoke/filters-smoke.js` | 1 | ✅ 100% | 0% | 275ms |
| `load/feed-load.js` | 10 | ✅ 100% | 0% | 267ms |
| `load/cards-load.js` | 20 | ✅ 100% | 0% | 270ms |
| `load/search-load.js` | 15 | ✅ 100% | 0% | 269ms |
| `scenarios/user-journey.js` | 5 | ✅ 100% | 0% | 281ms |
| `scenarios/payment-flow.js` | 2 | ✅ 100% | 0% | 269ms |
| `scenarios/messaging-flow.js` | 3 | ✅ 100% | 0% | 266ms |
| `scenarios/registration-flow.js` | 2 | ✅ 100% | 0% | 268ms |
| `performance/stress-quick.js` | 200 | ✅ 100% | 0% | 286ms |

---

## Стресс-тест (16.03.2026)

**Файл:** `tests/performance/stress-quick.js`
**Параметры:** 10→50→100→200 VU, 9 минут

| Метрика | Результат |
|---|---|
| Всего запросов | 33 644 |
| Ошибок | **0.00%** |
| Запросов/сек | **62.2 req/s** |
| P95 время ответа | **286ms** |
| Максимум | 1 198ms |

**Вывод:** при 200 одновременных пользователях P95 = 286ms — сервер не упёрся в предел.

---

## Как запустить

```bash
# Проверка живости продакшна (запускается автоматически после деплоя)
k6 run tests/smoke/production-smoke.js

# Нагрузочный тест ленты (10 VU, 5 мин)
k6 run tests/load/feed-load.js

# Стресс-тест (до 200 VU, 9 мин)
k6 run tests/performance/stress-quick.js

# Сценарий с авторизацией (передать сессию)
SESSION_COOKIE="sessionid=ваш_токен" k6 run tests/scenarios/messaging-flow.js
SESSION_COOKIE="sessionid=ваш_токен" k6 run tests/scenarios/payment-flow.js

# Против локального сервера
BASE_URL=http://localhost:8000 k6 run tests/smoke/production-smoke.js
```

---

## Когда повторить тесты

- После значительных изменений в API
- После масштабирования сервера
- При росте аудитории до 500+ пользователей в день
- Раз в месяц — плановая проверка
