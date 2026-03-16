import http from 'k6/http';
import { sleep } from 'k6';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Order View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий: Просмотр заказа
 * API: GET /api/order/{id}
 * Проверяет: просмотр, все поля, UI структура
 * 
 * ИСПОЛЬЗОВАНИЕ:
 *   ORDER_ID=1 SESSION_COOKIE="..." k6 run tests/forms/order-read.js
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const ORDER_ID = __ENV.ORDER_ID || '1';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.8']
  }
};

export default function() {
  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_COOKIE) {
    headers['Cookie'] = `sessionid=${SESSION_COOKIE}`;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  console.log(`👀 Просмотр заказа ID=${ORDER_ID}...`);
  const response = http.get(url, {
    headers: headers,
    tags: { name: 'OrderRead' }
  });

  checkViewOperation(response, 'Order Read', 'order');
  
  const requiredFields = [
    'id',
    'title',
    'work_type',
    'city',
    'description'
  ];
  checkRequiredFields(response, 'Order Read', requiredFields);
  
  const uiFields = [
    'title',
    'work_type',
    'city',
    'description',
    'budget',
    'deadline',
    'phone'
  ];
  checkUIStructure(response, 'Order Read', uiFields);

  console.log(`✅ Order Read: status=${response.status}`);
  
  sleep(0.3);
}
