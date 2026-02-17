# 🔐 GET AUTH TOKEN — Получение токена для k6 тестов (PowerShell)
#
# Использование:
#   .\scripts\get-auth-token.ps1
#   .\scripts\get-auth-token.ps1 -Phone "+79001234567" -Password "test123"

param(
    [string]$Phone = "+79001234567",
    [string]$Password = "test123",
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

Write-Host "`n🔐 Получение токена для $Phone...`n" -ForegroundColor Cyan

$body = @{
    phone = $Phone
    password = $Password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "✅ Успешно!`n" -ForegroundColor Green
    
    Write-Host "📋 Информация:" -ForegroundColor Yellow
    Write-Host "   User ID: $($response.user_id)" -ForegroundColor White
    Write-Host "   Phone: $($response.phone)" -ForegroundColor White
    Write-Host "   Token: $($response.token)`n" -ForegroundColor White
    
    Write-Host "💡 Использование в PowerShell:" -ForegroundColor Cyan
    Write-Host "   `$env:AUTH_TOKEN=`"$($response.token)`"" -ForegroundColor White
    Write-Host "   k6 run tests/forms/worker-create.js`n" -ForegroundColor White
    
    Write-Host "💡 Или inline:" -ForegroundColor Cyan
    Write-Host "   `$env:AUTH_TOKEN=`"$($response.token)`"; k6 run tests/forms/worker-create.js`n" -ForegroundColor White
    
    # Автоматически установить в текущей сессии
    $env:AUTH_TOKEN = $response.token
    Write-Host "✅ Токен установлен в `$env:AUTH_TOKEN для текущей сессии`n" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Ошибка: $($_.Exception.Message)`n" -ForegroundColor Red
    Write-Host "💡 Убедитесь что:" -ForegroundColor Yellow
    Write-Host "   1. Backend запущен: $BaseUrl" -ForegroundColor White
    Write-Host "   2. Пользователь существует (создайте через create_test_profiles.py)" -ForegroundColor White
    Write-Host "   3. Телефон и пароль correct`n" -ForegroundColor White
}
