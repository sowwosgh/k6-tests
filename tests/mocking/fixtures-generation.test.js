import { check, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';

const fixtureGenerationSuccess = new Rate('fixture_generation_success');

export const options = {
  vus: 1,
  iterations: 1, // Run once to generate fixtures
  thresholds: {
    'fixture_generation_success': ['rate>0.95'],
  },
};

// Fixture generators
const generators = {
  // Generate worker profiles
  generateWorker: (index) => ({
    id: index,
    phone: `+7900${String(1000000 + index).padStart(7, '0')}`,
    full_name: `Тестовый Работник ${index}`,
    city: ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург'][index % 4],
    specialization: ['Строитель', 'Электрик', 'Сантехник', 'Маляр'][index % 4],
    experience: Math.floor(Math.random() * 20),
    desired_salary: 40000 + Math.floor(Math.random() * 60000),
    rating: 3 + Math.random() * 2,
    is_active: true,
    is_verified: Math.random() > 0.3,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }),

  // Generate vacancies
  generateVacancy: (index) => ({
    id: index,
    title: `Вакансия ${index}`,
    specialization: ['Строитель', 'Электрик', 'Сантехник'][index % 3],
    city: ['Москва', 'Санкт-Петербург'][index % 2],
    salary_from: 50000 + Math.floor(Math.random() * 50000),
    salary_to: 80000 + Math.floor(Math.random() * 70000),
    experience_required: Math.floor(Math.random() * 10),
    employment_type: ['full_time', 'part_time', 'contract'][index % 3],
    company_name: `Компания ${index}`,
    is_active: true,
    is_urgent: Math.random() > 0.8,
    created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
  }),

  // Generate orders
  generateOrder: (index) => ({
    id: index,
    title: `Заказ ${index}`,
    description: `Описание заказа ${index}`,
    city: ['Москва', 'Санкт-Петербург', 'Казань'][index % 3],
    specialization: ['Строитель', 'Электрик', 'Сантехник', 'Маляр'][index % 4],
    budget_min: 10000 + Math.floor(Math.random() * 40000),
    budget_max: 50000 + Math.floor(Math.random() * 100000),
    deadline: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    is_urgent: Math.random() > 0.7,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }),

  // Generate brigades
  generateBrigade: (index) => ({
    id: index,
    name: `Бригада ${index}`,
    city: ['Москва', 'Санкт-Петербург'][index % 2],
    specializations: ['Строительство', 'Ремонт', 'Отделка'].slice(0, (index % 3) + 1),
    members_count: 3 + Math.floor(Math.random() * 7),
    total_experience: 5 + Math.floor(Math.random() * 20),
    rating: 3.5 + Math.random() * 1.5,
    is_active: true,
    created_at: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString(),
  }),

  // Generate reviews
  generateReview: (index, targetId, targetType) => ({
    id: index,
    target_type: targetType,
    target_id: targetId,
    author_id: Math.floor(Math.random() * 100) + 1,
    rating: 1 + Math.floor(Math.random() * 5),
    comment: `Отзыв номер ${index}. ${['Отлично', 'Хорошо', 'Нормально', 'Плохо'][Math.floor(Math.random() * 4)]}.`,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }),

  // Generate applications
  generateApplication: (index, workerId, targetId, targetType) => ({
    id: index,
    worker_id: workerId,
    target_type: targetType,
    target_id: targetId,
    status: ['pending', 'accepted', 'rejected', 'completed'][Math.floor(Math.random() * 4)],
    message: `Сопроводительное письмо для заявки ${index}`,
    created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
  }),
};

export default function () {
  group('Fixture Generation', () => {
    // Generate workers
    group('Generate Worker Fixtures', () => {
      const workers = [];
      for (let i = 1; i <= 100; i++) {
        workers.push(generators.generateWorker(i));
      }

      const success = check(workers, {
        'generated 100 workers': (w) => w.length === 100,
        'all have valid phones': (w) => w.every(x => x.phone.startsWith('+7900')),
        'all have names': (w) => w.every(x => x.full_name !== undefined),
        'all have cities': (w) => w.every(x => x.city !== undefined),
      });

      fixtureGenerationSuccess.add(success ? 1 : 0);
      console.log(`Generated ${workers.length} worker fixtures`);
    });

    // Generate vacancies
    group('Generate Vacancy Fixtures', () => {
      const vacancies = [];
      for (let i = 1; i <= 50; i++) {
        vacancies.push(generators.generateVacancy(i));
      }

      check(vacancies, {
        'generated 50 vacancies': (v) => v.length === 50,
        'all have titles': (v) => v.every(x => x.title !== undefined),
        'all have salary ranges': (v) => v.every(x => x.salary_from <= x.salary_to),
      });

      console.log(`Generated ${vacancies.length} vacancy fixtures`);
    });

    // Generate orders
    group('Generate Order Fixtures', () => {
      const orders = [];
      for (let i = 1; i <= 50; i++) {
        orders.push(generators.generateOrder(i));
      }

      check(orders, {
        'generated 50 orders': (o) => o.length === 50,
        'all have budgets': (o) => o.every(x => x.budget_min <= x.budget_max),
        'all have deadlines': (o) => o.every(x => x.deadline !== undefined),
      });

      console.log(`Generated ${orders.length} order fixtures`);
    });

    // Generate brigades
    group('Generate Brigade Fixtures', () => {
      const brigades = [];
      for (let i = 1; i <= 20; i++) {
        brigades.push(generators.generateBrigade(i));
      }

      check(brigades, {
        'generated 20 brigades': (b) => b.length === 20,
        'all have members': (b) => b.every(x => x.members_count >= 3),
        'all have specializations': (b) => b.every(x => x.specializations.length > 0),
      });

      console.log(`Generated ${brigades.length} brigade fixtures`);
    });

    // Generate reviews
    group('Generate Review Fixtures', () => {
      const reviews = [];
      for (let i = 1; i <= 200; i++) {
        const targetType = ['worker', 'vacancy', 'order'][i % 3];
        const targetId = Math.floor(Math.random() * 50) + 1;
        reviews.push(generators.generateReview(i, targetId, targetType));
      }

      check(reviews, {
        'generated 200 reviews': (r) => r.length === 200,
        'all have ratings 1-5': (r) => r.every(x => x.rating >= 1 && x.rating <= 5),
        'all have comments': (r) => r.every(x => x.comment !== undefined),
      });

      console.log(`Generated ${reviews.length} review fixtures`);
    });

    // Generate applications
    group('Generate Application Fixtures', () => {
      const applications = [];
      for (let i = 1; i <= 150; i++) {
        const workerId = Math.floor(Math.random() * 100) + 1;
        const targetType = ['vacancy', 'order'][i % 2];
        const targetId = Math.floor(Math.random() * 50) + 1;
        applications.push(generators.generateApplication(i, workerId, targetId, targetType));
      }

      check(applications, {
        'generated 150 applications': (a) => a.length === 150,
        'all have worker IDs': (a) => a.every(x => x.worker_id > 0),
        'all have statuses': (a) => a.every(x => ['pending', 'accepted', 'rejected', 'completed'].includes(x.status)),
      });

      console.log(`Generated ${applications.length} application fixtures`);
    });
  });
}

export function handleSummary(data) {
  console.log('Fixture Generation Summary:');
  console.log('Generated test data:');
  console.log('- 100 workers');
  console.log('- 50 vacancies');
  console.log('- 50 orders');
  console.log('- 20 brigades');
  console.log('- 200 reviews');
  console.log('- 150 applications');
  console.log('Total: 570 fixture records');
  console.log('Use Django management command to load fixtures into test database');
  console.log('Example: python manage.py loaddata fixtures.json');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
