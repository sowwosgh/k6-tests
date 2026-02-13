# k6 Load Testing Suite

Нагрузочное тестирование для HR Platform API.

## 🏗️ Структура

\`\`\`
k6-tests/
├── tests/           # Тесты по категориям
├── scripts/         # Вспомогательные скрипты
├── config/          # Конфигурации
├── utils/           # Переиспользуемые утилиты
├── data/            # Тестовые данные
├── results/         # Результаты (.gitignore)
└── .github/         # CI/CD workflows
\`\`\`

## 🚀 Быстрый старт

\`\`\`bash
# Установи k6: https://k6.io/docs/get-started/installation/

# Запуск smoke тестов
npm run test:smoke

# Запуск load тестов
npm run test:load

# Запуск всех тестов
npm run test:all

# Анализ результатов
npm run analyze
\`\`\`

## 📊 Типы тестов

### Smoke тесты (быстрая проверка)
- \`tests/smoke/api-health.js\` - базовая доступность API

### Load тесты (нагрузочные)
- \`tests/load/feed-load.js\` - нагрузка на ленту с фильтрацией
- \`tests/load/cards-load.js\` - нагрузка на карточки/ленты по типам
- \`tests/load/search-load.js\` - нагрузка на поисковые запросы

### Stress тесты (предельная нагрузка)
- \`tests/stress/feed-stress.js\` - стресс-тест ленты

### Сценарии (бизнес-логика)
- \`tests/scenarios/registration-flow.js\` - сценарий регистрации
- \`tests/scenarios/payment-flow.js\` - сценарий платежей
- \`tests/scenarios/user-journey.js\` - пользовательский путь
- \`tests/scenarios/messaging-flow.js\` - сценарий сообщений

## 🔧 Конфигурация

Настройки stages и thresholds в \`config/\`:
- \`stages.json\` - профили нагрузки
- \`thresholds.json\` - пороговые значения

## 🤝 Утилиты

\`utils/\` содержит переиспользуемые функции:
- \`auth.js\` - работа с авторизацией
- \`checks.js\` - кастомные проверки

## 📈 CI/CD

Тесты автоматически запускаются:
- При пуше в main/develop
- При создании PR
- Ежедневно в 2:00 (по расписанию)

## 📝 Статус тестирования

См. [_archive/TESTING_STATUS.md](_archive/TESTING_STATUS.md)

## 🔮 Планы

- [ ] Добавить stress тесты
- [ ] Реализовать сценарии пользователя
- [ ] Интеграция с Grafana Cloud
- [ ] Авто-генерация тестовых данных
\`\`\`
