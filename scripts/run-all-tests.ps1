# ═══════════════════════════════════════════════════════════════════════
# 🚀 K6 MASTER TEST RUNNER
# Запускает все тесты последовательно с отчетами
# ═══════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
$global:TotalPassed = 0
$global:TotalFailed = 0
$global:StartTime = Get-Date

# Цвета для вывода
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning-Custom { Write-Host $args -ForegroundColor Yellow }

# ═══════════════════════════════════════════════════════════════════════
# ФУНКЦИЯ ЗАПУСКА ТЕСТА
# ═══════════════════════════════════════════════════════════════════════
function Run-K6Test {
    param(
        [string]$TestPath,
        [string]$TestName,
        [string]$Category,
        [bool]$RequiresAuth = $false
    )
    
    Write-Info "`n┌─────────────────────────────────────────────────────────┐"
    Write-Info "│ 📋 Running: $TestName"
    Write-Info "│ 📂 Category: $Category"
    Write-Info "│ 🔐 Auth Required: $RequiresAuth"
    Write-Info "└─────────────────────────────────────────────────────────┘"
    
    $ExportPath = "results/$Category-$(Split-Path $TestPath -Leaf).json".Replace('.js.json', '.json')
    
    # Запуск теста с таймаутом
    $Command = "k6 run --quiet $TestPath --summary-export=$ExportPath"
    
    $TestStart = Get-Date
    $Process = Start-Process powershell -ArgumentList "-Command", $Command -NoNewWindow -Wait -PassThru
    $TestEnd = Get-Date
    $Duration = ($TestEnd - $TestStart).TotalSeconds
    
    if ($Process.ExitCode -eq 0) {
        Write-Success "✅ PASSED — $TestName (${Duration}s)"
        $global:TotalPassed++
        return $true
    } else {
        Write-Error-Custom "❌ FAILED — $TestName (${Duration}s)"
        $global:TotalFailed++
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════
# ПРОВЕРКА ОКРУЖЕНИЯ
# ═══════════════════════════════════════════════════════════════════════
Write-Info "╔═══════════════════════════════════════════════════════════╗"
Write-Info "║         🚀 K6 MASTER TEST RUNNER v1.0                    ║"
Write-Info "╚═══════════════════════════════════════════════════════════╝"

# Проверка k6
if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "❌ k6 не установлен! Установите: choco install k6"
    exit 1
}

# Проверка Django
$DjangoProcess = Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*hr_platform*"}
if (-not $DjangoProcess) {
    Write-Warning-Custom "⚠️ Django сервер не запущен!"
    Write-Info "Запустите: cd backend; python manage.py runserver"
    $Continue = Read-Host "Продолжить тестирование? (y/n)"
    if ($Continue -ne 'y') { exit 1 }
}

# Создать директорию для результатов
New-Item -ItemType Directory -Path "results" -Force | Out-Null

# ═══════════════════════════════════════════════════════════════════════
# 1️⃣ SMOKE TESTS — Быстрая проверка работоспособности API
# ═══════════════════════════════════════════════════════════════════════
Write-Info "`n`n═══════════════════════════════════════════════════════════"
Write-Info "🔷 PHASE 1: SMOKE TESTS"
Write-Info "═══════════════════════════════════════════════════════════"

Run-K6Test "tests/smoke/api-health.js" "API Health Check" "smoke"
Run-K6Test "tests/smoke/cards-smoke.js" "Cards Smoke Test" "smoke"
Run-K6Test "tests/smoke/filters-smoke.js" "Filters Smoke Test" "smoke"

# ═══════════════════════════════════════════════════════════════════════
# 2️⃣ FORMS TESTS (Complete) — Основные сценарии форм
# ═══════════════════════════════════════════════════════════════════════
Write-Info "`n`n═══════════════════════════════════════════════════════════"
Write-Info "🔷 PHASE 2: FORMS TESTS (Complete Scenarios)"
Write-Info "═══════════════════════════════════════════════════════════"

Run-K6Test "tests/forms/feed-viewer-complete.js" "FeedViewerRule Complete" "forms"
Run-K6Test "tests/forms/quick-create-complete.js" "QuickCreateFormRule Complete" "forms"

# MyProfilesFormRule требует авторизации
if ($env:SESSION_COOKIE) {
    Run-K6Test "tests/forms/my-profiles-complete.js" "MyProfilesFormRule Complete" "forms" -RequiresAuth $true
} else {
    Write-Warning-Custom "⚠️ Пропущен MyProfilesFormRule — нет SESSION_COOKIE"
}

# ═══════════════════════════════════════════════════════════════════════
# 3️⃣ INDIVIDUAL FORMS TESTS — Детальные тесты каждой формы
# ═══════════════════════════════════════════════════════════════════════
Write-Info "`n`n═══════════════════════════════════════════════════════════"
Write-Info "🔷 PHASE 3: INDIVIDUAL FORMS TESTS"
Write-Info "═══════════════════════════════════════════════════════════"

$FormTypes = @("worker", "brigade", "contractor", "customer", "vacancy", "resume", "order", "tender")

forEach ($type in $FormTypes) {
    Write-Info "`n📋 Testing $type forms..."
    Run-K6Test "tests/forms/$type-create.js" "$type CREATE" "forms-individual"
    Run-K6Test "tests/forms/$type-read.js" "$type READ" "forms-individual"
    Run-K6Test "tests/forms/$type-update.js" "$type UPDATE" "forms-individual"
}

# ═══════════════════════════════════════════════════════════════════════
# 4️⃣ REGRESSION TESTS — Проверка регрессий
# ═══════════════════════════════════════════════════════════════════════
Write-Info "`n`n═══════════════════════════════════════════════════════════"
Write-Info "🔷 PHASE 4: REGRESSION TESTS"
Write-Info "═══════════════════════════════════════════════════════════"

Run-K6Test "tests/regression-simple.js" "Regression Simple" "regression"

# ═══════════════════════════════════════════════════════════════════════
# 5️⃣ SCENARIOS — Пользовательские сценарии
# ═══════════════════════════════════════════════════════════════════════
Write-Info "`n`n═══════════════════════════════════════════════════════════"
Write-Info "🔷 PHASE 5: USER SCENARIOS"
Write-Info "═══════════════════════════════════════════════════════════"

Run-K6Test "tests/scenarios/registration-flow.js" "Registration Flow" "scenarios"
Run-K6Test "tests/scenarios/user-journey.js" "User Journey" "scenarios"
Run-K6Test "tests/scenarios/payment-flow.js" "Payment Flow" "scenarios"
Run-K6Test "tests/scenarios/messaging-flow.js" "Messaging Flow" "scenarios"

# ═══════════════════════════════════════════════════════════════════════
# 6️⃣ LOAD TESTS — Нагрузочные тесты (опционально)
# ═══════════════════════════════════════════════════════════════════════
$RunLoadTests = Read-Host "`n🔥 Запустить нагрузочные тесты? (y/n)"
if ($RunLoadTests -eq 'y') {
    Write-Info "`n`n═══════════════════════════════════════════════════════════"
    Write-Info "🔷 PHASE 6: LOAD TESTS"
    Write-Info "═══════════════════════════════════════════════════════════"
    
    Run-K6Test "tests/load/feed-load.js" "Feed Load Test" "load"
    Run-K6Test "tests/load/cards-load.js" "Cards Load Test" "load"
    Run-K6Test "tests/load/search-load.js" "Search Load Test" "load"
}

# ═══════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════
$EndTime = Get-Date
$TotalDuration = ($EndTime - $global:StartTime).TotalSeconds
$TotalTests = $global:TotalPassed + $global:TotalFailed
$PassRate = if ($TotalTests -gt 0) { [math]::Round(($global:TotalPassed / $TotalTests) * 100, 2) } else { 0 }

Write-Info "`n`n╔═══════════════════════════════════════════════════════════╗"
Write-Info "║                 📊 FINAL REPORT                          ║"
Write-Info "╠═══════════════════════════════════════════════════════════╣"
Write-Success "║  ✅ Passed:  $global:TotalPassed / $TotalTests tests ($PassRate%)                     ║"
Write-Error-Custom "║  ❌ Failed:  $global:TotalFailed / $TotalTests tests                              ║"
Write-Info "║  ⏱️  Total Time: ${TotalDuration}s                              ║"
Write-Info "╚═══════════════════════════════════════════════════════════╝"

# Проверка результатов JSON
$JsonResults = Get-ChildItem -Path "results" -Filter "*.json" | Measure-Object
Write-Info "`n📁 Результаты сохранены: $($JsonResults.Count) JSON файлов в ./results/"

# Выход с кодом ошибки если есть failed тесты
if ($global:TotalFailed -gt 0) {
    Write-Warning-Custom "`n⚠️ Некоторые тесты провалились. Проверьте результаты в ./results/"
    exit 1
} else {
    Write-Success "`n🎉 Все тесты успешно пройдены!"
    exit 0
}
