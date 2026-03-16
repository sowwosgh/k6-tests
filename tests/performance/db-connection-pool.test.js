import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const dbConnections = new Counter('db_connections');
const connectionErrors = new Counter('connection_errors');
const queryTime = new Trend('query_time');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 150 },   // Heavy DB load
    { duration: '3m', target: 200 },   // Push to connection limit
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed': ['rate<0.1'],
    'connection_errors': ['count<100'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();
  
  // Simulate heavy DB queries
  const operations = [
    // List operations (expensive)
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/feed?page=1&page_size=50`, {
        headers: authHeaders,
      });
      queryTime.add(Date.now() - startTime);
      
      check(res, {
        'feed loaded': (r) => r.status === 200,
        'no connection error': (r) => !r.body.includes('connection') && !r.body.includes('pool'),
      }) || connectionErrors.add(1);
      
      dbConnections.add(1);
    },
    
    // Search operations (joins)
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/search/workers?city=Москва&min_salary=50000`, {
        headers: authHeaders,
      });
      queryTime.add(Date.now() - startTime);
      
      check(res, {
        'search completed': (r) => r.status === 200,
      }) || connectionErrors.add(1);
      
      dbConnections.add(1);
    },
    
    // Detail operations (relations)
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/worker/1`, {
        headers: authHeaders,
      });
      queryTime.add(Date.now() - startTime);
      
      check(res, {
        'profile loaded': (r) => r.status === 200,
      }) || connectionErrors.add(1);
      
      dbConnections.add(1);
    },
    
    // Write operations
    () => {
      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/credits/balance`, {
        headers: authHeaders,
      });
      queryTime.add(Date.now() - startTime);
      
      check(res, {
        'balance retrieved': (r) => r.status === 200,
      }) || connectionErrors.add(1);
      
      dbConnections.add(1);
    },
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();

  sleep(0.5); // Minimal think time to stress connections
}

export function handleSummary(data) {
  console.log('DB Connection Pool Test Summary:');
  console.log(`Total DB Connections: ${data.metrics.db_connections.values.count}`);
  console.log(`Connection Errors: ${data.metrics.connection_errors.values.count}`);
  console.log(`Average Query Time: ${data.metrics.query_time.values.avg}ms`);
  console.log(`95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log('Check Django DB pool settings (CONN_MAX_AGE, CONN_HEALTH_CHECKS)');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
