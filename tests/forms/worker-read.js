import http from 'k6/http';
import { sleep } from 'k6';
import { authHeaders } from '../../utils/auth.js';
import { 
  checkViewOperation,
  checkRequiredFields,
  checkUIStructure,
  checkContactsPaywall
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Worker Profile View (FeedViewerRule + MyProfilesFormRule)
 * 
 * Сценарий 1: Просмотр из ленты (FeedViewerRule) — контакты замаскированы
 * Сценарий 2: Просмотр своего профиля (MyProfilesFormRule) — полный доступ
 * API: GET /api/worker/{id}
 * Проверяет: просмотр, все поля, UI структура, paywall контактов
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const WORKER_ID = __ENV.WORKER_ID || '1'; // ID для тестирования

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.95']
  }
};

export default function() {
  const url = `${BASE_URL}/api/worker/${WORKER_ID}`;
  
  console.log(`👀 Просмотр профиля специалиста ID=${WORKER_ID}...`);
  const response = http.get(url, {
    headers: authHeaders(),
    tags: { name: 'WorkerRead' }
  });

  // 5️⃣ Проверка просмотра
  checkViewOperation(response, 'Worker Read', 'worker');
  
  // 2️⃣ Проверка обязательных полей
  const requiredFields = [
    'id',
    'full_name',
    'specialization',
    'work_city',
    'status'
  ];
  checkRequiredFields(response, 'Worker Read', requiredFields);
  
  // 7️⃣ Проверка UI-полей для отображения
  const uiFields = [
    'full_name',
    'specialization',
    'work_city',
    'salary_amount',
    'experience_years',
    'contact_phone'
  ];
  checkUIStructure(response, 'Worker Read', uiFields);

  // Проверка paywall контактов (если это не свой профиль)
  const isOwn = __ENV.IS_OWN_PROFILE === 'true';
  checkContactsPaywall(response, 'Worker Read', isOwn);

  console.log(`✅ Worker Read: status=${response.status}`);
  
  sleep(0.3);
}
