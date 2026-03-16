import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const memoryLeaks = new Counter('potential_memory_leaks');
const responseSizeGrowth = new Gauge('response_size_growth');

let baselineResponseSize = 0;
let iterationCount = 0;

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '30m', target: 20 },  // Long-running test
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'potential_memory_leaks': ['count<10'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();
  iterationCount++;

  // Create and cleanup data repeatedly
  const operations = [
    // List operations that might accumulate data
    () => {
      const res = http.get(`${BASE_URL}/api/feed?page=1&page_size=100`, {
        headers: authHeaders,
      });
      
      const responseSize = res.body.length;
      
      // Track baseline
      if (baselineResponseSize === 0) {
        baselineResponseSize = responseSize;
      }
      
      // Check for response size growth (potential memory leak indicator)
      const growth = (responseSize - baselineResponseSize) / baselineResponseSize;
      responseSizeGrowth.add(growth);
      
      if (growth > 0.5 && iterationCount > 100) {
        memoryLeaks.add(1);
        console.log(`Potential memory leak detected: ${growth * 100}% growth in response size`);
      }
      
      check(res, {
        'feed loaded': (r) => r.status === 200,
        'response size stable': () => growth < 0.5,
      });
    },
    
    // Search with filters (potential query result caching issues)
    () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city=Москва&specialization=Строитель`, {
        headers: authHeaders,
      });
      
      check(res, {
        'search completed': (r) => r.status === 200,
        'response time stable': (r) => r.timings.duration < 3000,
      });
    },
    
    // Create temporary data
    () => {
      const res = http.get(`${BASE_URL}/api/applications`, {
        headers: authHeaders,
      });
      
      check(res, {
        'applications loaded': (r) => r.status === 200,
      });
    },
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();

  // Check response time degradation over iterations
  if (iterationCount % 100 === 0) {
    console.log(`Iteration ${iterationCount}: Response size growth: ${responseSizeGrowth.value * 100}%`);
  }

  sleep(2);
}

export function handleSummary(data) {
  console.log('Memory Leak Detection Test Summary:');
  console.log(`Total Iterations: ${iterationCount}`);
  console.log(`Potential Memory Leaks Detected: ${data.metrics.potential_memory_leaks.values.count}`);
  console.log(`Response Size Growth: ${data.metrics.response_size_growth.values.value * 100}%`);
  console.log(`Average Response Time: ${data.metrics.http_req_duration.values.avg}ms`);
  console.log('Monitor Django process memory usage during this test');
  console.log('Check for QuerySet accumulation, unclosed connections, cached objects');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
