# План безопасной чистки кодовой базы HR Platform

**Дата начала:** 17 февраля 2026  
**Статус:** В процессе - Неделя 1  
**Ответственный:** Development Team

---

## 📋 Общая стратегия

- **Принцип:** Постепенная архивация неиспользуемого кода через `_archive/`
- **Безопасность:** Git-теги перед каждой операцией + обязательное тестирование
- **Темп:** 1-2 файла/папки в день
- **Период наблюдения:** 48-72 часа после деплоя
- **Откат:** Всегда возможен через git revert или восстановление из тега

---

## 🗓️ НЕДЕЛЯ 1 (17-23 февраля) — Подготовка и тесты форм

### Цели недели:
- ✅ Проверить текущие k6-тесты
- ✅ Создать недостающие тесты для всех форм
- ✅ Настроить npm-скрипты для автоматизации
- ✅ Убедиться, что все тесты проходят локально и на staging

### Задачи:

#### 1. Аудит существующих тестов
```bash
# Проверить структуру k6-tests
cd k6-tests
tree tests/ или ls -R tests/

# Запустить существующие тесты
k6 run tests/forms/existing-test.js

Чек-лист форм для тестирования:

 Personal Info Form (view/edit)
 Education Form (view/edit/delete-check)
 Experience Form (view/edit/delete-check)
 Skills Form (view/edit)
 Languages Form (view/edit/delete-check)
 Contacts Form (view/edit)
 Brigade Form (view/edit)
 Settings Form (view/edit)
Итого: 8 форм × 3 режима = 24 теста

2. Создать npm-скрипты
Добавить в k6-tests/package.json:

{
  "scripts": {
    "test:forms": "k6 run tests/forms/all-forms.js",
    "test:forms:smoke": "k6 run tests/forms/smoke-test.js",
    "test:forms:full": "k6 run --vus 10 --duration 30s tests/forms/all-forms.js"
  }
}

3. Локальное тестирование

npm run test:forms
# Ожидаемый результат: все тесты зеленые

4. Staging тестирование

# Установить staging URL в переменных окружения
export BASE_URL=https://staging.sowwos.com
npm run test:forms

Критерий завершения недели 1: Все 24 теста проходят успешно локально и на staging.

🗓️ НЕДЕЛЯ 2 (24 февраля - 2 марта) — Пилотная архивация
Цели недели:
Выбрать 1-2 кандидата на архивацию (подозрительные неиспользуемые файлы)
Провести первую безопасную архивацию
Отработать процесс и скрипты
Процедура архивации (повторяемая):
Шаг 1: Создать git-тег

git tag -a pre-cleanup-20260224 -m "Backup before cleanup 2026-02-24"
git push origin --tags

Шаг 2: Проверить использование файла

# Проверить импорты и упоминания
git grep -n "ИмяФайла"
# или через ripgrep
rg "ИмяФайла" --type js --type vue

# Пример для конкретного компонента
git grep -n "OldComponent" frontend/src/

Критерии архивации:

❌ Нет импортов в коде
❌ Нет упоминаний в роутинге
❌ Нет использования в templates
✅ Файл создан > 3 месяцев назад
✅ Нет коммитов за последние 3 месяца
Шаг 3: Переместить в архив

# Создать структуру _archive/
mkdir -p _archive/$(dirname path/to/file)

# Переместить файл
git mv path/to/file _archive/path/to/file

# Коммит с описанием
git commit -m "archive: moved path/to/file to _archive/ (unused since 2025-11)"

# Пуш в feature-ветку
git push origin feature/cleanup-week2

Шаг 4: Тестирование

# Запустить все тесты форм
npm run test:forms

# Запустить smoke-тесты
npm run test:forms:smoke

# Проверить сборку frontend
cd frontend
npm run build

# Проверить backend
cd backend
python manage.py check
python manage.py test

Шаг 5: Создать PR и деплой на staging
Создать Pull Request с префиксом [CLEANUP]
Дождаться прохождения CI/CD
Деплой на staging
Запустить тесты на staging
Шаг 6: Период наблюдения (48-72ч)
Что мониторить:

 Логи backend (errors, warnings)
 Console errors в браузере
 Sentry (если настроен) — новые ошибки
 User flows: логин → просмотр профиля → редактирование → сохранение
 Метрики производительности
Журнал наблюдения:

День 1 (24.02): Deploy на staging 14:00
  - ✅ Логи чистые
  - ✅ User flows работают
  - ✅ Console без ошибок
  
День 2 (25.02): Проверка 10:00
  - ✅ Нет новых ошибок
  - ✅ Пользователи не жалуются
  
День 3 (26.02): Финальная проверка 16:00
  - ✅ Всё стабильно → готово к merge

  Шаг 7: Merge в main (если всё ОК)

  # Через GitHub PR или командой
git checkout main
git merge --no-ff feature/cleanup-week2
git push origin main

Кандидаты на архивацию (Неделя 2):
TBD — определим после аудита в Неделю 1
TBD — определим после аудита в Неделю 1
🗓️ НЕДЕЛЯ 3-4 (3-16 марта) — Масштабирование
Цели:
Архивировать 10-15 файлов/папок по отработанной процедуре
Вести журнал всех операций
Минимум 1 деплой в неделю на staging
Ежедневный чек-лист:
 Выбрать 1-2 файла из списка кандидатов
 Создать git tag (можно один на серию)
 git grep проверка
 git mv → commit → push
 Тесты локально
 PR → staging → наблюдение
 Обновить журнал в CLEANUP_JOURNAL.md
Список кандидатов (TBD после аудита):
 frontend/src/components/old/...
 backend/old_api/...
 Неиспользуемые utils
 Закомментированный код
 Дублирующиеся компоненты
🛠️ Инструменты и скрипты
Скрипт автоматизации: tools/archive-and-test.sh

#!/usr/bin/env bash
set -e

FILE_OR_DIR="$1"
TAG="pre-cleanup-$(date +%Y%m%d-%H%M)"

if [ -z "$FILE_OR_DIR" ]; then
  echo "Usage: $0 path/to/file-or-dir"
  exit 1
fi

echo "🏷️  Creating tag $TAG..."
git tag -a "$TAG" -m "backup before cleanup $TAG"
git push origin --tags

echo "🔍 Checking references..."
if git grep -n "$FILE_OR_DIR" >/dev/null 2>&1; then
  echo "⚠️  Warning: found references to $FILE_OR_DIR"
  echo "Review and confirm manual removal if needed."
  read -p "Continue anyway? (y/N): " confirm
  if [[ "$confirm" != "y" ]]; then
    git tag -d "$TAG" 2>/dev/null || true
    exit 2
  fi
fi

echo "📦 Moving $FILE_OR_DIR to _archive/..."
mkdir -p "_archive/$(dirname "$FILE_OR_DIR")"
git mv "$FILE_OR_DIR" "_archive/$FILE_OR_DIR"
git commit -m "archive: moved $FILE_OR_DIR to _archive/ (safety move)"
git push

echo "🧪 Running form tests..."
cd k6-tests
npm run test:forms

echo "✅ Tests passed! Monitor staging/prod for 48-72h."
echo "📝 Don't forget to update CLEANUP_JOURNAL.md"

Использование:

chmod +x tools/archive-and-test.sh
./tools/archive-and-test.sh frontend/src/components/OldComponent.vue

PowerShell версия: tools/archive-and-test.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$FileOrDir
)

$ErrorActionPreference = "Stop"
$Tag = "pre-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmm')"

Write-Host "🏷️  Creating tag $Tag..." -ForegroundColor Cyan
git tag -a $Tag -m "backup before cleanup $Tag"
git push origin --tags

Write-Host "🔍 Checking references..." -ForegroundColor Cyan
$refs = git grep -n $FileOrDir 2>$null
if ($refs) {
    Write-Host "⚠️  Warning: found references to $FileOrDir" -ForegroundColor Yellow
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne "y") {
        git tag -d $Tag 2>$null
        exit 2
    }
}

Write-Host "📦 Moving $FileOrDir to _archive/..." -ForegroundColor Cyan
$archivePath = "_archive/$FileOrDir"
$null = New-Item -Path (Split-Path $archivePath) -ItemType Directory -Force
git mv $FileOrDir $archivePath
git commit -m "archive: moved $FileOrDir to _archive/ (safety move)"
git push

Write-Host "🧪 Running form tests..." -ForegroundColor Cyan
Set-Location k6-tests
npm run test:forms

Write-Host "✅ Tests passed! Monitor staging/prod for 48-72h." -ForegroundColor Green
Write-Host "📝 Don't forget to update CLEANUP_JOURNAL.md" -ForegroundColor Yellow

🚨 Откат изменений (Rollback)
Вариант 1: Revert последнего коммита

git revert <commit-hash>
git push origin feature/cleanup-week2

Вариант 2: Восстановление из тега

# Создать ветку от тега
git checkout -b restore-from-backup pre-cleanup-20260224

# Восстановить конкретный файл
git checkout pre-cleanup-20260224 -- path/to/file

# Коммит и пуш
git commit -m "rollback: restore path/to/file from pre-cleanup-20260224"
git push

Вариант 3: Вернуть файл из _archive/

git mv _archive/path/to/file path/to/file
git commit -m "rollback: restore path/to/file from archive"
git push

📊 Метрики успеха
По завершении 4 недель должно быть:
✅ 24+ тестов форм работают стабильно
✅ 15-20 неиспользуемых файлов архивировано
✅ 0 критических багов из-за чистки
✅ Полный журнал операций в CLEANUP_JOURNAL.md
✅ Отработанный процесс для будущих чисток
✅ Уменьшение размера кодовой базы на 5-10%
KPI процесса:
Безопасность: 0 critical bugs
Скорость: 1-2 файла/день
Покрытие тестами: 100% критических форм
Время отката: < 30 минут при необходимости
📝 Журнал изменений
17 февраля 2026
✅ Создан план чистки
⏳ Начало Недели 1: аудит тестов
Неделя 1 (17-23 февраля)
 День 1: Аудит k6-тестов
 День 2-3: Создание недостающих тестов
 День 4: Настройка npm-скриптов
 День 5: Локальное тестирование
 День 6-7: Staging тестирование
Неделя 2 (24 февраля - 2 марта)
 Первая архивация
 Отработка процесса
 Период наблюдения
Неделя 3-4 (3-16 марта)
 Масштабирование архивации
 Завершение основной чистки
🎯 Следующие шаги (сегодня)
Проверить структуру k6-tests:

Запустить существующие тесты:

Создать список кандидатов на архивацию:

Поиск старых файлов без изменений
Анализ неиспользуемых импортов
Проверка закомментированного кода
Создать tools/ директорию и скрипты:

mkdir -p tools
# Создать archive-and-test.sh или .ps1
📚 Полезные команды
Поиск старых файлов (не менялись > 90 дней):
find frontend/src -name "*.vue" -mtime +90
find backend/core -name "*.py" -mtime +90
Поиск неиспользуемых импортов:
# Все .vue файлы
rg "import.*from" frontend/src --type vue

# Найти компоненты без импортов
for file in frontend/src/components/**/*.vue; do
  name=$(basename "$file" .vue)
  if ! git grep -q "$name" --exclude="$file"; then
    echo "Unused: $file"
  fi
done
Поиск закомментированного кода:
rg "^\\s*//.*TODO|FIXME|XXX|HACK" frontend/src
rg "^\\s*#.*TODO|FIXME|XXX|HACK" backend/
Статистика кодовой базы:
# Общее количество файлов
find frontend/src -name "*.vue" -o -name "*.js" | wc -l
find backend -name "*.py" | wc -l

# Размер кодовой базы
du -sh frontend/src backend/
Автор плана: GitHub Copilot
Последнее обновление: 17 февраля 2026
Версия: 1.0


Создай этот файл в VS Code и мы начнем работать по нему! Хочешь, чтобы я сразу начал с **Шага 1 из Недели 1** — проверить текущие k6-тесты?Создай этот файл в VS Code и мы начнем работать по нему! Хочешь, чтобы я сразу начал с **Шага 1 из Недели 1** — проверить текущие k6-тесты?
