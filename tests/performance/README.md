# ⚡ Performance Tests

Advanced performance testing для проверки системы под нагрузкой.

## 📁 Тесты

| Test File                      | Type         | Description                    | Duration | Status |
|--------------------------------|--------------|--------------------------------|----------|--------|
| `stress-test.test.js`          | Stress       | Find breaking point            | ~10min   | 🔴 TODO |
| `spike-test.test.js`           | Spike        | Sudden traffic spikes          | ~5min    | 🔴 TODO |
| `soak-test.test.js`            | Soak         | Long-duration load (1-3h)      | 1-3h     | 🔴 TODO |
| `concurrent-users.test.js`     | Load         | 100+ concurrent VUs            | ~10min   | 🔴 TODO |
| `db-connection-pool.test.js`   | Load         | DB connection pool limits      | ~5min    | 🔴 TODO |
| `memory-leak.test.js`          | Soak         | Memory leak detection          | ~30min   | 🔴 TODO |
| `cache-effectiveness.test.js`  | Performance  | Cache hit rates                | ~5min    | 🔴 TODO |
| `static-files-perf.test.js`    | Performance  | Static assets performance      | ~3min    | 🔴 TODO |
| `api-degradation.test.js`      | Load         | Graceful degradation           | ~10min   | 🔴 TODO |
| `websocket-load.test.js`       | Load         | WebSocket connections          | ~5min    | 🔴 TODO |

**Total:** 0/10 (0%)

## 🎯 Типы тестов

### 1. Stress Test
Увеличивать нагрузку до breaking point:
```
VUs: 1 → 10 → 50 → 100 → 200 → 500 → FAIL
```

### 2. Spike Test
Резкие всплески трафика:
```
VUs: 10 (5min) → 500 (1min) → 10 (5min)
```

### 3. Soak Test
Длительная стабильная нагрузка:
```
VUs: 50 constant for 1-3 hours
```

### 4. Load Test
Sustained load:
```
VUs: 100 constant for 10 minutes
```

## 🚀 Запуск

```bash
# Basic load (quick)
npm run test:load

# Advanced performance tests
npm run test:performance

# Stress test (найти предел)
k6 run tests/performance/stress-test.test.js

# Soak test (долгий)
k6 run --duration 3h tests/performance/soak-test.test.js
```

## 🛠️ Шаблон Performance теста

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Load
    { duration: '5m', target: 100 },  // Increase
    { duration: '2m', target: 0 }     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    http_reqs: ['rate>100']  // Min 100 RPS
  }
};

export default function() {
  const BASE_URL = 'https://sowwos.ru';
  
  const response = http.get(`${BASE_URL}/api/feed`);
  
  check(response, {
    'status 200': (r) => r.status === 200,
    'response < 1s': (r) => r.timings.duration < 1000
  });
  
  sleep(1);
}
```

## 📊 Performance Targets

| Metric              | Target        | Critical |
|---------------------|---------------|----------|
| Response Time (p95) | < 1000ms      | < 2000ms |
| Response Time (p99) | < 2000ms      | < 5000ms |
| Error Rate          | < 1%          | < 5%     |
| Throughput          | > 100 RPS     | > 50 RPS |
| Concurrent Users    | 100+          | 50+      |

## 🔗 Ссылки

- [Master Test Plan](../../TEST_PLAN.md)
- [k6 Performance Guide](https://k6.io/docs/test-types/introduction/)
