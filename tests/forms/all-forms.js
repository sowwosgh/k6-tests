import { group } from 'k6';
import { sleep } from 'k6';

/**
 * 🧪 ALL FORMS TESTS — Комплексный тест всех форм
 * 
 * Запускает тесты для всех 3 сценариев:
 * 1. QuickCreateFormRule (создание)
 * 2. MyProfilesFormRule (просмотр/редактирование)
 * 3. FeedViewerRule (просмотр из ленты с paywall)
 * 
 * Использование:
 *   k6 run tests/forms/all-forms.js
 *   npm run test:forms
 */

import workerCreate from './worker-create.js';
import workerRead from './worker-read.js';
import workerUpdate from './worker-update.js';

import brigadeCreate from './brigade-create.js';
import brigadeRead from './brigade-read.js';
import brigadeUpdate from './brigade-update.js';

import contractorCreate from './contractor-create.js';
import contractorRead from './contractor-read.js';
import contractorUpdate from './contractor-update.js';

import customerCreate from './customer-create.js';
import customerRead from './customer-read.js';
import customerUpdate from './customer-update.js';

import employerCreate from './employer-create.js';
import employerRead from './employer-read.js';
import employerUpdate from './employer-update.js';

import companyCreate from './company-create.js';
import companyRead from './company-read.js';
import companyUpdate from './company-update.js';

import vacancyCreate from './vacancy-create.js';
import vacancyRead from './vacancy-read.js';
import vacancyUpdate from './vacancy-update.js';

import resumeCreate from './resume-create.js';
import resumeRead from './resume-read.js';
import resumeUpdate from './resume-update.js';

import orderCreate from './order-create.js';
import orderRead from './order-read.js';
import orderUpdate from './order-update.js';

import tenderCreate from './tender-create.js';
import tenderRead from './tender-read.js';
import tenderUpdate from './tender-update.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.90'],           // 90% минимум для прохождения
    http_req_failed: ['rate<0.1']    // Менее 10% ошибок
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)']
};

export default function() {
  // ═══════════════════════════════════════════════════════════
  // 👷 WORKER (Специалист)
  // ═══════════════════════════════════════════════════════════
  
  group('Worker Profile Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      workerCreate();
      sleep(1);
    });

    group('2. Read (MyProfilesFormRule)', () => {
      workerRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      workerUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 👥 BRIGADE (Бригада)
  // ═══════════════════════════════════════════════════════════
  
  group('Brigade Profile Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      brigadeCreate();
      sleep(1);
    });

    group('2. Read (MyProfilesFormRule)', () => {
      brigadeRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      brigadeUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 🏢 CONTRACTOR (Подрядчик)
  // ═══════════════════════════════════════════════════════════
  
  group('Contractor Profile Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      contractorCreate();
      sleep(1);
    });

    group('2. Read (MyProfilesFormRule)', () => {
      contractorRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      contractorUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 👑 CUSTOMER (Заказчик)
  // ═══════════════════════════════════════════════════════════
  
  group('Customer Profile Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      customerCreate();
      sleep(1);
    });

    group('2. Read (MyProfilesFormRule)', () => {
      customerRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      customerUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 🏢 EMPLOYER (Работодатель)
  // ═══════════════════════════════════════════════════════════
  
  group('Employer Profile Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      employerCreate();
      sleep(1);
    });

    group('2. Read (MyProfilesFormRule)', () => {
      employerRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      employerUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 🏭 COMPANY (Компания)
  // ═══════════════════════════════════════════════════════════
  
  group('Company Profile Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      companyCreate();
      sleep(1);
    });

    group('2. Read (MyProfilesFormRule)', () => {
      companyRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      companyUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 💼 VACANCY (Вакансия)
  // ═══════════════════════════════════════════════════════════
  
  group('Vacancy Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      vacancyCreate();
      sleep(1);
    });

    group('2. Read (FeedViewerRule)', () => {
      vacancyRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      vacancyUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📄 RESUME (Резюме)
  // ═══════════════════════════════════════════════════════════
  
  group('Resume Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      resumeCreate();
      sleep(1);
    });

    group('2. Read (FeedViewerRule)', () => {
      resumeRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      resumeUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📋 ORDER (Заказ)
  // ═══════════════════════════════════════════════════════════
  
  group('Order Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      orderCreate();
      sleep(1);
    });

    group('2. Read (FeedViewerRule)', () => {
      orderRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      orderUpdate();
      sleep(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📢 TENDER (Тендер)
  // ═══════════════════════════════════════════════════════════
  
  group('Tender Tests', () => {
    group('1. Create (QuickCreateFormRule)', () => {
      tenderCreate();
      sleep(1);
    });

    group('2. Read (FeedViewerRule)', () => {
      tenderRead();
      sleep(1);
    });

    group('3. Update (MyProfilesFormRule)', () => {
      tenderUpdate();
      sleep(1);
    });
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true })
  };
}

function textSummary(data, { indent = '', enableColors = false } = {}) {
  const green = enableColors ? '\x1b[32m' : '';
  const red = enableColors ? '\x1b[31m' : '';
  const yellow = enableColors ? '\x1b[33m' : '';
  const reset = enableColors ? '\x1b[0m' : '';
  
  const checkRate = data.metrics.checks ? (data.metrics.checks.passes / (data.metrics.checks.passes + data.metrics.checks.fails) * 100).toFixed(2) : 0;
  const failedRate = data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0;
  
  let summary = '\n';
  summary += `${indent}╔═══════════════════════════════════════════════════════╗\n`;
  summary += `${indent}║         📊 FORMS TESTING SUMMARY                      ║\n`;
  summary += `${indent}╠═══════════════════════════════════════════════════════╣\n`;
  
  // Checks
  if (checkRate >= 95) {
    summary += `${indent}║  Checks:         ${green}✅ ${checkRate}% passed${reset}${' '.repeat(38 - checkRate.toString().length)}║\n`;
  } else if (checkRate >= 90) {
    summary += `${indent}║  Checks:         ${yellow}⚠️  ${checkRate}% passed${reset}${' '.repeat(38 - checkRate.toString().length)}║\n`;
  } else {
    summary += `${indent}║  Checks:         ${red}❌ ${checkRate}% passed${reset}${' '.repeat(38 - checkRate.toString().length)}║\n`;
  }
  
  // Failed requests
  if (failedRate < 5) {
    summary += `${indent}║  Failed:         ${green}✅ ${failedRate}% requests${reset}${' '.repeat(37 - failedRate.toString().length)}║\n`;
  } else {
    summary += `${indent}║  Failed:         ${red}❌ ${failedRate}% requests${reset}${' '.repeat(37 - failedRate.toString().length)}║\n`;
  }
  
  // Duration
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  summary += `${indent}║  Avg Duration:   ${avgDuration}ms${' '.repeat(42 - avgDuration.toString().length)}║\n`;
  
  summary += `${indent}╚═══════════════════════════════════════════════════════╝\n`;
  
  return summary;
}
