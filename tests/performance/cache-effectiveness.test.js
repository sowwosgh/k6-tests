import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { BASE_URL } from '../../../config.js';

const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');
const cacheHitRate = new Rate('cache_hit_rate');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'cache_hit_rate': ['rate>0.7'], // At least 70% cache hit rate
    'http_req_duration': ['p(95)<1000'], // Should be fast with cache
  },
};

export default function () {
  // Test cacheable endpoints multiple times
  const cachedEndpoints = [
    `${BASE_URL}/api/worker/1`,
    `${BASE_URL}/api/worker/2`,
    `${BASE_URL}/api/vacancy/1`,
    `${BASE_URL}/api/order/1`,
    `${BASE_URL}/api/feed?type=worker&page=1`,
  ];

  // 80% of requests hit the same cached endpoints
  const useCached = Math.random() < 0.8;
  const endpoint = useCached 
    ? cachedEndpoints[Math.floor(Math.random() * cachedEndpoints.length)]
    : `${BASE_URL}/api/feed?page=${Math.floor(Math.random() * 100)}`;

  const startTime = Date.now();
  const res = http.get(endpoint);
  const duration = Date.now() - startTime;

  // Heuristic: Fast response likely means cache hit
  const isCacheHit = duration < 200 && res.status === 200;
  
  if (isCacheHit) {
    cacheHits.add(1);
    cacheHitRate.add(1);
  } else {
    cacheMisses.add(1);
    cacheHitRate.add(0);
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'fast response (potential cache)': () => duration < 500,
  });

  // Check cache headers
  check(res, {
    'has cache headers': (r) => {
      const cacheControl = r.headers['Cache-Control'];
      const etag = r.headers['ETag'];
      return cacheControl !== undefined || etag !== undefined;
    },
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const hits = data.metrics.cache_hits.values.count;
  const misses = data.metrics.cache_misses.values.count;
  const total = hits + misses;
  const hitRate = total > 0 ? (hits / total * 100) : 0;

  console.log('Cache Effectiveness Test Summary:');
  console.log(`Total Requests: ${total}`);
  console.log(`Cache Hits: ${hits} (${hitRate.toFixed(2)}%)`);
  console.log(`Cache Misses: ${misses} (${(100 - hitRate).toFixed(2)}%)`);
  console.log(`95th Percentile Response Time: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log('Check Django cache configuration (Redis, Memcached, Database cache)');
  console.log('Verify @cache_page decorators, select_related, prefetch_related usage');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
