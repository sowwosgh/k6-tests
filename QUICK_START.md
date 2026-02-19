# 🚀 K6 Test Suite — Quick Start

## 📊 Что у нас есть

**46+ тестов** организованы в 5 категорий:

- ✅ **Forms Tests** (36 файлов) — CRUD операции для всех типов профилей
- ✅ **Smoke Tests** (3 файла) — быстрая проверка API health
- ✅ **Load Tests** (3 файла) — нагрузочные тесты
- ✅ **Scenarios** (4 файла) — user journey, payments, messaging
- ✅ **Regression** (1 файл) — проверка регрессий

## 🎯 Что можно сделать ПРЯМО СЕЙЧАС

### 1️⃣ Запустить ВСЕ тесты локально

```bash
# В первом терминале — Django
cd backend
python manage.py runserver

# Во втором терминале — k6 tests
cd k6-tests
npm run test:full
```

**Результат:**
- Все 46+ тестов запустятся последовательно
- Результаты сохранятся в `results/*.json`
- Откроется HTML отчет с визуализацией

**Время:** ~10-15 минут

---

### 2️⃣ Запустить только главные тесты (complete)

```bash
npm run test:feed-viewer:complete     # FeedViewerRule (100%)
npm run test:quick-create:complete    # QuickCreateFormRule (100%)

# С авторизацией:
$env:SESSION_COOKIE="sessionid=7v7j1sz24ac2xqzqjw0ycxcqfikwoj3s"
npm run test:my-profiles:complete     # MyProfilesFormRule (100%)
```

**Время:** ~30 секунд (все 3 теста)

---

### 3️⃣ Smoke test — быстрая проверка

```bash
npm run test:smoke  # API health check
```

**Время:** ~5 секунд

---

### 4️⃣ Создать HTML отчет вручную

```bash
# 1. Запустить несколько тестов с экспортом
npm run test:feed-viewer:complete:verbose
npm run test:quick-create:complete:verbose

# 2. Сгенерировать HTML
npm run report:html

# 3. Открыть в браузере
start test-report.html
```

---

## 📚 Полная документация

См. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — детальный план развития тестов (17 рекомендаций)

**Основные темы:**
- Удаление дублирования
- Расширение coverage (DELETE, SEARCH, E2E)
- Нагрузочное тестирование (stress, spike, soak)
- CI/CD интеграция (GitHub Actions)
- Мониторинг (Grafana, InfluxDB)
- Security testing

---

## 🔧 Текущие результаты

| Test Suite | Checks | Pass Rate | Status |
|------------|--------|-----------|--------|
| FeedViewerRule | 177/177 | 100% | ✅ |
| QuickCreateFormRule | 52/52 | 100% | ✅ |
| MyProfilesFormRule | 84/84 | 100% | ✅ |
| **TOTAL** | **313/313** | **100%** | ✅ |

**Performance:** P95 = 24ms (avg)  
**HTTP Success:** 100% (0 failures)

---

## 🎬 Next Steps

1. **Week 1:** Запустить master runner → очистить дубликаты → настроить CI/CD
2. **Week 2-3:** Добавить DELETE/SEARCH → E2E тесты → Performance budgets
3. **Month 1-2:** Stress testing → Grafana → Security → Dashboards

**Детали:** См. [RECOMMENDATIONS.md](RECOMMENDATIONS.md)

---

**Создано:** 19.02.2026  
**Автор:** GitHub Copilot (Claude Sonnet 4.5)
