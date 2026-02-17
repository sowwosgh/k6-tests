#!/usr/bin/env node

/**
 * 🔐 GET SESSION — Получение sessionid для k6 тестов
 * 
 * Django использует session-based auth (cookie), не JWT
 * 
 * Использование:
 *   node get-auth-token.js
 *   node get-auth-token.js phone password
 *   node get-auth-token.js +79160000001 test123
 * 
 * Затем скопируйте sessionid и используйте:
 *   export SESSION_COOKIE="your-sessionid-here"
 *   SESSION_COOKIE="your-sessionid" k6 run tests/forms/worker-create.js
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const phone = process.argv[2] || '+79160000001';  // Тестовый пользователь
const password = process.argv[3] || 'test123';    // Тестовый пароль

const payload = JSON.stringify({
  phone: phone,
  password: password
});

const options = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`\n🔐 Получение сессии для ${phone}...\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        
        // Извлекаем sessionid из Set-Cookie
        const setCookie = res.headers['set-cookie'];
        let sessionId = null;
        
        if (setCookie && Array.isArray(setCookie)) {
          const sessionCookie = setCookie.find(c => c.startsWith('sessionid='));
          if (sessionCookie) {
            const match = sessionCookie.match(/sessionid=([^;]+)/);
            if (match) {
              sessionId = match[1];
            }
          }
        }
        
        if (sessionId) {
          console.log('✅ Успешно!\n');
          console.log('📋 Информация:');
          console.log(`   User ID: ${json.user?.id || 'N/A'}`);
          console.log(`   Phone: ${json.user?.phone || phone}`);
          console.log(`   SessionID: ${sessionId}\n`);
          
          console.log('💡 Использование в bash:');
          console.log(`   export SESSION_COOKIE="${sessionId}"`);
          console.log(`   k6 run tests/forms/worker-create.js\n`);
          
          console.log('💡 Использование в PowerShell:');
          console.log(`   $env:SESSION_COOKIE="${sessionId}"`);
          console.log(`   k6 run tests/forms/worker-create.js\n`);
          
          console.log('💡 Или inline:');
          console.log(`   SESSION_COOKIE="${sessionId}" k6 run tests/forms/worker-create.js\n`);
        } else {
          console.log('⚠️ Вход выполнен, но sessionid не найден в cookies');
          console.log('Response headers:', res.headers);
        }
        
      } catch (e) {
        console.error('❌ Ошибка парсинга JSON:', e.message);
        console.log('Response:', data);
      }
    } else {
      console.error(`❌ Ошибка: HTTP ${res.statusCode}`);
      console.log('Response:', data);
      console.log('\n💡 Убедитесь что:');
      console.log('   1. Backend запущен: http://127.0.0.1:8000');
      console.log('   2. Пользователь существует (python backend/create_test_profiles.py)');
      console.log('   3. Телефон и пароль correct\n');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Ошибка запроса: ${e.message}`);
  console.log('\n💡 Убедитесь что backend запущен:');
  console.log('   cd backend');
  console.log('   python manage.py runserver\n');
});

req.write(payload);
req.end();
