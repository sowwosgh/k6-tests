const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════
// 📊 K6 TEST RESULTS HTML REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════

const RESULTS_DIR = path.join(__dirname, '..', 'results');
const OUTPUT_FILE = path.join(__dirname, '..', 'test-report.html');

// Читаем все JSON результаты
const jsonFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));

console.log(`📊 Найдено ${jsonFiles.length} файлов с результатами...`);

const results = [];
for (const file of jsonFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
    results.push({
      filename: file,
      data: data
    });
  } catch (err) {
    console.warn(`⚠️ Не удалось прочитать ${file}:`, err.message);
  }
}

// Генерируем HTML
const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K6 Test Report — HR Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #2c3e50; margin-bottom: 10px; font-size: 2.5rem; }
    .subtitle { color: #7f8c8d; margin-bottom: 30px; font-size: 1.1rem; }
    
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .summary-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .summary-card h3 { color: #34495e; margin-bottom: 15px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
    .summary-card .value { font-size: 2.5rem; font-weight: bold; }
    .summary-card .label { color: #95a5a6; font-size: 0.9rem; margin-top: 5px; }
    
    .success { color: #27ae60; }
    .error { color: #e74c3c; }
    .warning { color: #f39c12; }
    .info { color: #3498db; }
    
    .test-results { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .test-item { border-bottom: 1px solid #ecf0f1; padding: 20px 0; }
    .test-item:last-child { border-bottom: none; }
    .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .test-name { font-size: 1.2rem; font-weight: 600; color: #2c3e50; }
    .test-status { padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; }
    .status-passed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    
    .test-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-top: 15px; }
    .metric { background: #f8f9fa; padding: 12px; border-radius: 6px; }
    .metric-label { font-size: 0.85rem; color: #6c757d; margin-bottom: 5px; }
    .metric-value { font-size: 1.3rem; font-weight: 600; color: #2c3e50; }
    
    .timestamp { text-align: center; margin-top: 40px; color: #95a5a6; font-size: 0.9rem; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ecf0f1; }
    th { background: #f8f9fa; font-weight: 600; color: #495057; font-size: 0.9rem; }
    tr:hover { background: #f8f9fa; }
    
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-danger { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 K6 Performance Test Report</h1>
    <p class="subtitle">HR Platform — Full Test Suite Results</p>
    
    ${generateSummary(results)}
    
    <div class="test-results">
      <h2 style="margin-bottom: 25px; color: #2c3e50;">Detailed Results</h2>
      ${generateDetailedResults(results)}
    </div>
    
    <div class="timestamp">
      Generated: ${new Date().toLocaleString('ru-RU', { dateStyle: 'full', timeStyle: 'medium' })}
    </div>
  </div>
</body>
</html>
`;

function generateSummary(results) {
  let totalTests = results.length;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalChecks = 0;
  let passedChecks = 0;
  let totalRequests = 0;
  let failedRequests = 0;
  let avgDuration = 0;
  
  for (const r of results) {
    const metrics = r.data.metrics;
    
    // Checks
    if (metrics.checks) {
      const passes = metrics.checks.values.passes || 0;
      const fails = metrics.checks.values.fails || 0;
      totalChecks += passes + fails;
      passedChecks += passes;
      
      if (fails === 0) totalPassed++;
      else totalFailed++;
    }
    
    // HTTP Requests
    if (metrics.http_reqs) {
      totalRequests += metrics.http_reqs.values.count || 0;
    }
    
    if (metrics.http_req_failed) {
      failedRequests += (metrics.http_req_failed.values.passes || 0);
    }
    
    // Duration
    if (metrics.http_req_duration) {
      avgDuration += metrics.http_req_duration.values.avg || 0;
    }
  }
  
  avgDuration = totalTests > 0 ? Math.round(avgDuration / totalTests) : 0;
  const passRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0;
  const failRate = totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) : 0;
  
  return `
    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value info">${totalTests}</div>
        <div class="label">${totalPassed} passed / ${totalFailed} failed</div>
      </div>
      
      <div class="summary-card">
        <h3>Total Checks</h3>
        <div class="value ${passedChecks === totalChecks ? 'success' : 'warning'}">${passedChecks}/${totalChecks}</div>
        <div class="label">${passRate}% pass rate</div>
      </div>
      
      <div class="summary-card">
        <h3>HTTP Requests</h3>
        <div class="value info">${totalRequests}</div>
        <div class="label">${failRate}% failure rate</div>
      </div>
      
      <div class="summary-card">
        <h3>Avg Duration</h3>
        <div class="value ${avgDuration < 100 ? 'success' : avgDuration < 500 ? 'warning' : 'error'}">${avgDuration}ms</div>
        <div class="label">Average response time</div>
      </div>
    </div>
  `;
}

function generateDetailedResults(results) {
  let html = '';
  
  for (const r of results) {
    const m = r.data.metrics;
    const testName = r.filename.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const checks = m.checks || {};
    const checksPasses = checks.values?.passes || 0;
    const checksFails = checks.values?.fails || 0;
    const checksTotal = checksPasses + checksFails;
    const checksRate = checksTotal > 0 ? ((checksPasses / checksTotal) * 100).toFixed(1) : 0;
    
    const httpReqs = m.http_reqs?.values?.count || 0;
    const httpFailed = m.http_req_failed?.values?.rate || 0;
    const httpFailedPct = (httpFailed * 100).toFixed(2);
    
    const duration = m.http_req_duration?.values || {};
    const avgDuration = Math.round(duration.avg || 0);
    const p95Duration = Math.round(duration['p(95)'] || 0);
    
    const status = checksFails === 0 ? 'passed' : 'failed';
    
    html += `
      <div class="test-item">
        <div class="test-header">
          <div class="test-name">${testName}</div>
          <div class="test-status status-${status}">${status.toUpperCase()}</div>
        </div>
        
        <div class="test-metrics">
          <div class="metric">
            <div class="metric-label">Checks</div>
            <div class="metric-value">${checksPasses}/${checksTotal} <span style="font-size: 0.9rem; color: ${checksRate >= 85 ? '#27ae60' : '#e74c3c'};">(${checksRate}%)</span></div>
          </div>
          
          <div class="metric">
            <div class="metric-label">HTTP Requests</div>
            <div class="metric-value">${httpReqs} <span style="font-size: 0.9rem; color: ${httpFailedPct < 1 ? '#27ae60' : '#e74c3c'};">(${httpFailedPct}% fails)</span></div>
          </div>
          
          <div class="metric">
            <div class="metric-label">Avg Duration</div>
            <div class="metric-value">${avgDuration}ms</div>
          </div>
          
          <div class="metric">
            <div class="metric-label">P95 Duration</div>
            <div class="metric-value">${p95Duration}ms</div>
          </div>
        </div>
        
        ${generateThresholdsTable(r.data.metrics)}
      </div>
    `;
  }
  
  return html;
}

function generateThresholdsTable(metrics) {
  const thresholds = [];
  
  if (metrics.checks) {
    thresholds.push({
      name: 'checks',
      threshold: 'rate > 0.85',
      actual: ((metrics.checks.values.passes / (metrics.checks.values.passes + metrics.checks.values.fails)) || 0).toFixed(3),
      passed: metrics.checks.thresholds ? Object.values(metrics.checks.thresholds)[0] : true
    });
  }
  
  if (metrics.http_req_failed) {
    thresholds.push({
      name: 'http_req_failed',
      threshold: 'rate < 0.15',
      actual: (metrics.http_req_failed.values.rate || 0).toFixed(3),
      passed: metrics.http_req_failed.thresholds ? Object.values(metrics.http_req_failed.thresholds)[0] : true
    });
  }
  
  if (metrics.http_req_duration) {
    thresholds.push({
      name: 'http_req_duration',
      threshold: 'p(95) < 3000',
      actual: Math.round(metrics.http_req_duration.values['p(95)'] || 0) + 'ms',
      passed: metrics.http_req_duration.thresholds ? Object.values(metrics.http_req_duration.thresholds)[0] : true
    });
  }
  
  if (thresholds.length === 0) return '';
  
  return `
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Threshold</th>
          <th>Actual</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${thresholds.map(t => `
          <tr>
            <td><code>${t.name}</code></td>
            <td>${t.threshold}</td>
            <td><strong>${t.actual}</strong></td>
            <td><span class="badge ${t.passed ? 'badge-success' : 'badge-danger'}">${t.passed ? '✓ PASSED' : '✗ FAILED'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Записываем HTML
fs.writeFileSync(OUTPUT_FILE, html, 'utf8');

console.log(`✅ Отчет создан: ${OUTPUT_FILE}`);
console.log(`📂 Откройте в браузере: file://${OUTPUT_FILE}`);
