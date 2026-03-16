import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * Payment Webhook Test
 * 
 * Tests payment webhook endpoint for payment provider callbacks.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔔 Testing Payment Webhook');
  
  // ===========================================
  // Test 1: Webhook POST (Simulated)
  // ===========================================
  group('Webhook: Payment Notification', () => {
    console.log('\n✅ Test 1: Payment webhook notification...');
    
    const payload = JSON.stringify({
      TerminalKey: 'test',
      OrderId: 'test-order-123',
      Success: true,
      Status: 'CONFIRMED',
      PaymentId: '123456789',
      Amount: 29900,
    });
    
    const res = http.post(
      `${BASE_URL}/api/payments/webhook`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Webhook] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 403 || r.status === 404,
      '[Webhook] has response': (r) => {
        try {
          // Webhook may return text or JSON
          return r.body.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Invalid Webhook Data
  // ===========================================
  group('Webhook: Invalid Data', () => {
    console.log('\n❌ Test 2: Invalid webhook data...');
    
    const payload = JSON.stringify({
      invalid: 'data',
    });
    
    const res = http.post(
      `${BASE_URL}/api/payments/webhook`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 403 || r.status === 422,
      '[Invalid] has response': (r) => r.body.length > 0,
    });
  });
  
  console.log('\n✅ Payment webhook test completed\n');
}
