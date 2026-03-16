import http from 'k6/http';
import { sleep } from 'k6';
import { authHeaders } from '../../utils/auth.js';
import { 
  checkEditOperation,
  checkRequiredFields 
} from '../../utils/form-helper.js';

/**
 * 🧪 TEST: Worker Profile Update (MyProfilesFormRule)
 * 
 * Сценарий: Левое меню "Мои профили" → Редактировать 👷 Специалист
 * API: PATCH /api/worker/{id}
 * Проверяет: редактирование, обновление полей
 */

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const WORKER_ID = __ENV.WORKER_ID || '1';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.95']
  }
};

export default function() {
  const url = `${BASE_URL}/api/worker/${WORKER_ID}`;
  
  // Обновляем статус и зарплату
  const payload = JSON.stringify({
    search_status: 'open_to_offers',
    salary_amount: 85000,
    experience_years: 5
  });

  console.log(`✏️ Редактирование профиля специалиста ID=${WORKER_ID}...`);
  const response = http.patch(url, payload, {
    headers: authHeaders(),
    tags: { name: 'WorkerUpdate' }
  });

  // 4️⃣ Проверка редактирования
  checkEditOperation(response, 'Worker Update', 'search_status');
  
  // 2️⃣ Проверка что вернулись обновленные данные
  const requiredFields = [
    'id',
    'search_status',
    'salary_amount',
    'experience_years'
  ];
  checkRequiredFields(response, 'Worker Update', requiredFields);

  console.log(`✅ Worker Update: status=${response.status}`);
  
  sleep(0.5);
}
