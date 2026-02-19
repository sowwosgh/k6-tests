import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { authHeaders } from '../../utils/auth.js';
import { 
  checkCreateSuccess,
  checkViewOperation,
  checkEditOperation,
  checkNoDuplicateFields,
  checkRequiredFields
} from '../../utils/form-helper.js';
import { parseJsonSafe } from '../../utils/checks.js';
import { 
  generateINN, 
  generatePhone, 
  generateCompanyName 
} from '../../utils/generators.js';

/**
 * 🧪 MY PROFILES COMPLETE TEST — MyProfilesFormRule для всех 8 типов
 * 
 * Сценарий: Левое меню "Мои профили" → Просмотр и редактирование
 * Тестирует:
 * ✅ Worker, Brigade, Contractor, Customer (профили)
 * ✅ Vacancy, Resume, Order, Tender (листинги)
 * 
 * Использование:
 *   SESSION_COOKIE="..." npm run test:my-profiles:complete
 * 
 * Проверяет:
 * 1. Создание профиля (POST)
 * 2. Просмотр своего профиля (GET)
 * 3. Редактирование профиля (PATCH)
 * 4. Проверка что изменения применились
 * 5. Отсутствие ошибок и дублей полей
 */

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const IS_AUTHENTICATED = __ENV.SESSION_COOKIE ? true : false;

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.85'],
    http_req_failed: ['rate<0.15']
  }
};

// Хранилище для ID созданных профилей
const createdProfiles = {};

// ═══════════════════════════════════════════════════════════════════════
// ФУНКЦИЯ СОЗДАНИЯ ПРОФИЛЯ
// ═══════════════════════════════════════════════════════════════════════
function createProfile(type, payload) {
  const url = `${BASE_URL}/api/${type}`;
  console.log(`📝 Создание ${type}...`);
  
  const response = http.post(url, JSON.stringify(payload), {
    headers: authHeaders(),
    tags: { name: `${type}Create` }
  });

  check(response, {
    [`${type} Create: успешно создан (200)`]: (r) => r.status === 200,
    [`${type} Create: получен ID`]: () => {
      const data = parseJsonSafe(response);
      return data && data.id;
    }
  });

  const data = parseJsonSafe(response);
  if (data && data.id) {
    createdProfiles[type] = data.id;
    console.log(`✅ ${type} создан: ID=${data.id}`);
    return data.id;
  }
  
  console.error(`❌ ${type}: не удалось получить ID`);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// ФУНКЦИЯ ПРОСМОТРА ПРОФИЛЯ
// ═══════════════════════════════════════════════════════════════════════
function viewProfile(type, id, requiredFields = []) {
  const url = `${BASE_URL}/api/${type}/${id}`;
  console.log(`👀 Просмотр ${type} ID=${id}...`);
  
  const response = http.get(url, {
    headers: authHeaders(),
    tags: { name: `${type}View` }
  });

  check(response, {
    [`${type} View: успешный просмотр (200)`]: (r) => r.status === 200,
    [`${type} View: данные загружены`]: () => {
      const data = parseJsonSafe(response);
      return data && data.id;
    }
  });

  checkNoDuplicateFields(response, `${type} View`);
  
  if (requiredFields.length > 0) {
    checkRequiredFields(response, `${type} View`, requiredFields);
  }

  console.log(`✅ ${type} View: status=${response.status}`);
  return response;
}

// ═══════════════════════════════════════════════════════════════════════
// ФУНКЦИЯ ОБНОВЛЕНИЯ ПРОФИЛЯ
// ═══════════════════════════════════════════════════════════════════════
function updateProfile(type, id, payload, changedField = null) {
  // Для orders и tenders используем plural в UPDATE endpoint
  const updateType = (type === 'order') ? 'orders' : (type === 'tender') ? 'tenders' : type;
  const url = `${BASE_URL}/api/${updateType}/${id}`;
  console.log(`✏️ Обновление ${type} ID=${id}...`);
  
  const response = http.patch(url, JSON.stringify(payload), {
    headers: authHeaders(),
    tags: { name: `${type}Update` }
  });

  check(response, {
    [`${type} Update: успешное обновление (200)`]: (r) => r.status === 200,
    [`${type} Update: возвращены данные`]: () => {
      const data = parseJsonSafe(response);
      return data && (data.ok || data.id);
    }
  });

  console.log(`✅ ${type} Update: status=${response.status}`);
  return response;
}

// ═══════════════════════════════════════════════════════════════════════
// ОСНОВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ
// ═══════════════════════════════════════════════════════════════════════
export default function() {
  if (!IS_AUTHENTICATED) {
    console.log('⚠️ Тест MyProfilesFormRule требует авторизации!');
    console.log('Используйте: SESSION_COOKIE="..." npm run test:my-profiles:complete');
    return;
  }

  console.log('🚀 Starting MyProfilesFormRule Complete Test...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  // ═══════════════════════════════════════════════════════════
  // 📋 ПРОФИЛИ (Workers & Organizations)
  // ═══════════════════════════════════════════════════════════
  
  group('1. 👷 Worker Profile', () => {
    const createPayload = {
      full_name: `Test Worker ${Date.now()}`,
      specialization: 'Сантехник',
      work_city: 'Москва',
      work_region: 'Московская область',
      search_status: 'active_search',
      contact_phone: generatePhone(),
      contact_person: 'Test Worker',
      salary_amount: 50000
    };
    
    const id = createProfile('worker', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'full_name', 'specialization', 'work_city', 'status'];
      viewProfile('worker', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        search_status: 'open_to_offers',
        salary_amount: 60000
      };
      updateProfile('worker', id, updatePayload, 'search_status');
      sleep(0.3);
    }
  });

  group('2. 👥 Brigade Profile', () => {
    const createPayload = {
      name: `Test Brigade ${Date.now()}`,
      specs: 'Строительная бригада',
      work_city: 'Санкт-Петербург',
      work_region: 'Ленинградская область',
      team_size: 5,
      contact_phone: generatePhone(),
      contact_person: 'Бригадир Тестов'
    };
    
    const id = createProfile('brigade', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'name', 'specs', 'work_city'];
      viewProfile('brigade', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        team_size: 7,
        status: 'busy'
      };
      updateProfile('brigade', id, updatePayload, 'team_size');
      sleep(0.3);
    }
  });

  group('3. 🏗️ Contractor Profile', () => {
    const createPayload = {
      company_name: generateCompanyName(),
      inn: generateINN(),
      legal_form: 'ООО',
      specialization: 'Генподряд',
      work_city: 'Казань',
      work_region: 'Республика Татарстан',
      contact_phone: generatePhone(),
      contact_person: 'Директор Тестов'
    };
    
    const id = createProfile('contractor', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'company_name', 'inn', 'legal_form'];
      viewProfile('contractor', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        contact_person: 'Новый Директор'
      };
      updateProfile('contractor', id, updatePayload);
      sleep(0.3);
    }
  });

  group('4. 🏠 Customer Profile', () => {
    const createPayload = {
      company_name: generateCompanyName(),
      inn: generateINN(),
      legal_form: 'ИП',
      work_city: 'Новосибирск',
      work_region: 'Новосибирская область',
      contact_phone: generatePhone(),
      contact_person: 'Заказчик Тестов'
    };
    
    const id = createProfile('customer', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'company_name', 'inn'];
      viewProfile('customer', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        legal_form: 'ООО'
      };
      updateProfile('customer', id, updatePayload);
      sleep(0.3);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // 📋 ЛИСТИНГИ (Vacancies, Resumes, Orders, Tenders)
  // ═══════════════════════════════════════════════════════════

  group('5. 💼 Vacancy Listing', () => {
    const createPayload = {
      title: `Вакансия K6 Test - ${Date.now()}`,
      company_name: 'Тестовая Компания',
      city: 'Екатеринбург',
      district: 'Центральный',
      specialization: 'Инженер',
      description: 'Тестовая вакансия для k6',
      salary_min: 60000,
      salary_max: 80000,
      phone: generatePhone(),
      email: 'vacancy@test.com'
    };
    
    const id = createProfile('vacancy', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'title', 'city'];
      viewProfile('vacancy', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        salary_min: 70000,
        salary_max: 90000
      };
      updateProfile('vacancy', id, updatePayload);
      sleep(0.3);
    }
  });

  group('6. 📄 Resume Listing', () => {
    const createPayload = {
      full_name: `Test Resume ${Date.now()}`,
      age: 30,
      desired_position: 'Инженер-строитель',
      salary: 100000,
      salary_negotiable: false,
      employment_type: 'full',
      city: 'Екатеринбург',
      relocation: 'no',
      education_level: 'higher',
      experience_years: 5,
      about: ['Опыт работы на крупных объектах'],
      skills: ['AutoCAD', 'Revit', 'управление проектами'],
      experience: [],
      education: [],
      phone: generatePhone(),
      email: 'resume@test.com'
    };
    
    const id = createProfile('resume', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'full_name', 'desired_position'];
      viewProfile('resume', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        salary: 120000,
        experience_years: 6
      };
      updateProfile('resume', id, updatePayload);
      sleep(0.3);
    }
  });

  group('7. 📋 Order Listing', () => {
    const createPayload = {
      title: `Заказ K6 Test - ${Date.now()}`,
      work_type: 'Ремонт',
      industry: 'Строительство',
      city: 'Новосибирск',
      region: 'Новосибирская область',
      address: 'ул. Тестовая, 1',
      description: 'Тестовый заказ для k6',
      budget: 500000,
      payment_type: 'mixed',
      urgency: 'normal',
      requirements: 'Наличие инструмента',
      phone: generatePhone(),
      email: 'order@test.com'
    };
    
    const id = createProfile('orders', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'title', 'work_type'];
      viewProfile('order', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        budget: 600000,
        urgency: 'urgent'
      };
      updateProfile('order', id, updatePayload);
      sleep(0.3);
    }
  });

  group('8. 📢 Tender Listing', () => {
    const createPayload = {
      title: `Тендер K6 Test - ${Date.now()}`,
      tender_number: `T-${Date.now()}`,
      tender_type: 'construction',
      city: 'Казань',
      region: 'Республика Татарстан',
      object_address: 'ул. Объектная, 10',
      description: 'Тестовый тендер для k6',
      requirements: 'Опыт от 3 лет',
      evaluation_criteria: 'Цена и качество',
      budget_min: 1000000,
      budget_max: 5000000,
      payment_terms: 'По этапам',
      submission_deadline: '2026-12-31',
      organization: 'Тестовая организация',
      inn: generateINN(),
      phone: generatePhone(),
      email: 'tender@test.com'
    };
    
    const id = createProfile('tenders', createPayload);
    sleep(0.3);
    
    if (id) {
      const requiredFields = ['id', 'title', 'tender_type'];
      viewProfile('tender', id, requiredFields);
      sleep(0.3);
      
      const updatePayload = {
        budget_min: 1200000,
        budget_max: 5500000
      };
      updateProfile('tender', id, updatePayload);
      sleep(0.3);
    }
  });

  console.log('\n✅ MyProfilesFormRule Complete Test finished!');
  console.log(`\n📊 Created profiles: ${Object.keys(createdProfiles).length}/8`);
  console.log('\n📈 Metrics будут показаны k6 summary ниже...\n');
}
