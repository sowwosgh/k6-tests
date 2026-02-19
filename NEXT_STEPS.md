# 🚀 NEXT STEPS — K6 Testing Roadmap

**Status:** Directory restructured, 46/178 tests complete (25.8%)  
**Next Milestone:** M1 — Security Foundation (Week 1-2)  
**Target:** 24 tests (Auth, DELETE, Security, User)  

---

## ✅ COMPLETED TODAY (19.02.2026)

### 1. Directory Cleanup
- ✅ Deleted 9 obsolete test files
- ✅ Removed temporary JSON result files
- ✅ Created clean directory structure

### 2. Documentation
- ✅ **TEST_PLAN.md** — 10-week roadmap (132 tests)
- ✅ **PLAN_PROGRESS.md** — Progress tracking
- ✅ **README files** — In api/, integration/, security/, performance/
- ✅ Updated main README.md

### 3. Infrastructure
- ✅ Created 21 test directories
- ✅ Added 25+ npm scripts to package.json
- ✅ Updated .gitignore for results/

### 4. Git
- ✅ Committed all changes (eb4b852)
- ✅ Ready to push to remote

---

## 🎯 WEEK 1 TASKS (26.02 - 02.03)

**Goal:** Implement Auth + DELETE operations (16 tests)

### Day 1-2: Authentication (6 tests, 12h)
```bash
# Create auth tests
cd tests/api/auth/

# 1. Login test
code auth-login.test.js
# Test: POST /api/auth/login (success, wrong password, wrong phone)

# 2. Register test
code auth-register.test.js
# Test: POST /api/auth/register

# 3. Logout test
code auth-logout.test.js
# Test: POST /api/auth/logout

# 4. Auth Me test
code auth-me.test.js
# Test: GET /api/auth/me (authorized/anonymous)

# 5. SMS verification
code sms-verification.test.js
# Test: POST /api/sms/send-code, POST /api/sms/verify-code

# 6. Rate limiting
code rate-limiting.test.js
# Test: Rate limit protection (5 req/min)

# Run tests
npm run test:api:auth
```

### Day 3-4: DELETE Operations (10 tests, 10h)
```bash
cd tests/api/profiles/delete/

# Create DELETE tests for each profile type
code delete-worker.test.js
code delete-brigade.test.js
code delete-contractor.test.js
code delete-customer.test.js
code delete-employer.test.js
code delete-vacancy.test.js
code delete-resume.test.js
code delete-order.test.js
code delete-tender.test.js
code delete-review.test.js

# Each test should verify:
# - Own profile deletion → 200
# - Other's profile → 403
# - Non-existent → 404
# - Without auth → 401

# Run tests
npm run test:api:profiles:delete
```

### Day 5: Update Progress
```bash
# Update PLAN_PROGRESS.md
# Mark completed tests
# Update weekly progress

git add PLAN_PROGRESS.md tests/api/auth/ tests/api/profiles/delete/
git commit -m "feat(auth): Complete Week 1 Day 1-5 (16 tests)"
```

---

## 🎯 WEEK 2 TASKS (03.03 - 09.03)

**Goal:** Security + User Settings (14 tests)

### Security Tests (8 tests, 14h)
```bash
cd tests/security/

code sql-injection.test.js
code xss-protection.test.js
code csrf-protection.test.js
code authorization-bypass.test.js
code password-requirements.test.js
code session-hijacking.test.js
code file-upload-security.test.js

npm run test:security
```

### User Settings (6 tests, 8h)
```bash
cd tests/api/user/

code user-nickname.test.js
code user-avatar.test.js
code user-password.test.js
code user-profiles-list.test.js

npm run test:api:user
```

---

## 📝 TEST TEMPLATE (Copy-Paste)

```javascript
import http from 'k6/http';
import { check, group } from 'k6';
import { authHeaders } from '../../../utils/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.95'],
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05']
  }
};

export default function() {
  const BASE_URL = 'http://localhost:8000';
  
  group('Test Name', () => {
    // Test implementation
    const response = http.get(`${BASE_URL}/api/endpoint`, {
      headers: authHeaders()
    });
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'has expected data': (r) => {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('expected_field');
      }
    });
  });
}
```

---

## 🔧 USEFUL COMMANDS

### Run Tests
```bash
# All tests
npm run test:all-sequential

# Specific category
npm run test:api:auth
npm run test:api:favorites
npm run test:security

# Single test
k6 run tests/api/auth/auth-login.test.js

# With JSON output
k6 run --out json=results/auth-login.json tests/api/auth/auth-login.test.js
```

### Generate Reports
```bash
# HTML report
npm run report:html
# Open: results/html/report.html

# Full test + report
npm run test:full
```

### Update Progress
```bash
# Edit progress file
code PLAN_PROGRESS.md

# Update completed tests
# - [x] auth-login.test.js

# Commit
git add PLAN_PROGRESS.md tests/
git commit -m "feat: Complete auth tests (6/6)"
```

---

## 📊 PROGRESS TRACKING

### Update PLAN_PROGRESS.md After Each Test
```markdown
### Week 1 (26.02 - 02.03)
**Target:** Auth (6) + DELETE (10) = 16 tests  
**Completed:** 6/16  ← UPDATE THIS
**Status:** 🟡 In Progress  ← UPDATE THIS

### Auth & Authentication (6/6) ← UPDATE THIS
- [x] auth-login.test.js ← MARK COMPLETED
- [x] auth-register.test.js
- [ ] auth-logout.test.js
...
```

### Daily Log
```markdown
### 26.02.2026 (Monday)
- ✅ Created auth-login.test.js (100% pass)
- ✅ Created auth-register.test.js (100% pass)
- 🔄 Working on auth-logout.test.js
- 🎯 Next: Complete auth tests (4 remaining)
```

---

## 🔗 KEY FILES

| File | Description |
|------|-------------|
| [TEST_PLAN.md](TEST_PLAN.md) | **Master plan** — 10 weeks, 132 tests |
| [PLAN_PROGRESS.md](PLAN_PROGRESS.md) | **Progress tracking** — daily updates |
| [README.md](README.md) | **Main guide** — structure, commands |
| [RECOMMENDATIONS.md](RECOMMENDATIONS.md) | **Best practices** — 17 recommendations |
| [tests/api/README.md](tests/api/README.md) | **API tests guide** |
| [../TESTING_COVERAGE_ANALYSIS.md](../TESTING_COVERAGE_ANALYSIS.md) | **Coverage analysis** |

---

## 🎯 MILESTONES OVERVIEW

```
M0 ✅ Foundation       — 46/46 (100%) COMPLETE
M1 🔴 Security         — 0/24 (0%)   Week 1-2  ← YOU ARE HERE
M2 🔴 Monetization     — 0/25 (0%)   Week 3-4
M3 🔴 Communication    — 0/25 (0%)   Week 5-6
M4 🔴 Search & E2E     — 0/16 (0%)   Week 7-8
M5 🟡 Performance      — 3/18 (17%)  Week 9-10
```

**Total:** 46/178 tests (25.8%)

---

## 💡 TIPS

### 1. Start Small
Don't try to implement all 6 auth tests at once. Do one, verify it works, commit, then move to next.

### 2. Use Existing Tests as Reference
Look at [tests/forms/feed-viewer-complete.js](tests/forms/feed-viewer-complete.js) for patterns:
- How to use authHeaders()
- How to structure checks
- How to handle JSON response

### 3. Test Locally First
```bash
# Always test locally before committing
k6 run tests/api/auth/auth-login.test.js

# Check output:
# ✓ checks.........................: 100.00%
```

### 4. Commit Frequently
```bash
# After each test
git add tests/api/auth/auth-login.test.js
git commit -m "feat(auth): Add login test"

# Not everything at once
```

### 5. Update Progress Daily
Open PLAN_PROGRESS.md and mark completed tests. This gives visibility into progress.

---

## 📞 HELP

**Stuck?** Check:
1. [TEST_PLAN.md](TEST_PLAN.md) — See test specifications
2. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — Best practices
3. [tests/forms/](tests/forms/) — Working examples
4. GitHub Issues — Ask questions

**CI/CD:** `.github/workflows/k6-tests.yml` runs automatically on push

---

**Let's build 132 tests! 🚀**

**Next Action:** Start with `tests/api/auth/auth-login.test.js`  
**Target:** Complete Week 1 (16 tests) by 02.03.2026
