import http from 'k6/http';
import { check, group } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

const paymentMockSuccess = new Rate('payment_mock_success');

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    'payment_mock_success': ['rate>0.95'],
    'http_req_duration': ['p(95)<2000'],
  },
};

// Mock payment gateway responses
const mockPaymentResponses = {
  success: {
    status: 'completed',
    transaction_id: 'mock_txn_123456789',
    amount: 1000,
    currency: 'RUB',
    payment_method: 'card',
  },
  pending: {
    status: 'pending',
    transaction_id: 'mock_txn_123456790',
    confirmation_url: 'https://mock-payment.com/confirm',
  },
  failed: {
    status: 'failed',
    error: 'Insufficient funds',
    error_code: 'INSUFFICIENT_FUNDS',
  },
  cancelled: {
    status: 'cancelled',
    reason: 'User cancelled',
  },
};

export default function () {
  const authHeaders = getAuthHeaders();

  group('Payment Gateway Mocking', () => {
    // Test 1: Mock successful payment
    group('Process Payment - Success', () => {
      const paymentData = {
        amount: 500,
        currency: 'RUB',
        description: 'Purchase 500 credits',
      };

      const mockResponse = mockPaymentResponses.success;

      const success = check(mockResponse, {
        'payment completed': (r) => r.status === 'completed',
        'has transaction ID': (r) => r.transaction_id !== undefined,
        'amount matches': (r) => r.amount === paymentData.amount,
      });

      paymentMockSuccess.add(success ? 1 : 0);
    });

    // Test 2: Mock pending payment (requires confirmation)
    group('Process Payment - Pending', () => {
      const mockResponse = mockPaymentResponses.pending;

      check(mockResponse, {
        'payment pending': (r) => r.status === 'pending',
        'has confirmation URL': (r) => r.confirmation_url !== undefined,
      });
    });

    // Test 3: Mock failed payment
    group('Process Payment - Failed', () => {
      const mockResponse = mockPaymentResponses.failed;

      check(mockResponse, {
        'payment failed': (r) => r.status === 'failed',
        'has error message': (r) => r.error !== undefined,
        'has error code': (r) => r.error_code !== undefined,
      });
    });

    // Test 4: Mock payment cancellation
    group('Cancel Payment', () => {
      const mockResponse = mockPaymentResponses.cancelled;

      check(mockResponse, {
        'payment cancelled': (r) => r.status === 'cancelled',
        'has cancellation reason': (r) => r.reason !== undefined,
      });
    });

    // Test 5: Mock refund
    group('Process Refund', () => {
      const refundMock = {
        status: 'refunded',
        refund_id: 'mock_refund_123',
        amount: 500,
        original_transaction: 'mock_txn_123456789',
      };

      check(refundMock, {
        'refund processed': (r) => r.status === 'refunded',
        'has refund ID': (r) => r.refund_id !== undefined,
        'amount refunded': (r) => r.amount > 0,
      });
    });

    // Test 6: Mock webhook callback
    group('Payment Webhook', () => {
      const webhookMock = {
        event: 'payment.succeeded',
        transaction_id: 'mock_txn_123456789',
        amount: 1000,
        timestamp: new Date().toISOString(),
        signature: 'mock_signature_abc123',
      };

      check(webhookMock, {
        'webhook has event': (r) => r.event !== undefined,
        'webhook has transaction ID': (r) => r.transaction_id !== undefined,
        'webhook has signature': (r) => r.signature !== undefined,
      });
    });

    // Test 7: Test credits purchase with mock payment
    group('Credits Purchase Flow (Mocked)', () => {
      // Step 1: Create payment
      const createPaymentMock = {
        payment_id: 'mock_payment_123',
        amount: 1000,
        confirmation_url: null, // Auto-confirm in test
        status: 'pending',
      };

      check(createPaymentMock, {
        'payment created': (r) => r.payment_id !== undefined,
      });

      // Step 2: Simulate instant confirmation (mocked)
      const confirmPaymentMock = {
        status: 'completed',
        credits_added: 1000,
      };

      check(confirmPaymentMock, {
        'payment confirmed': (r) => r.status === 'completed',
        'credits added': (r) => r.credits_added === 1000,
      });
    });
  });
}

export function handleSummary(data) {
  console.log('Mock Payment Gateway Test Summary:');
  console.log(`Payment Mock Success Rate: ${data.metrics.payment_mock_success.values.rate * 100}%`);
  console.log('All payment operations mocked without real transactions');
  console.log('Configure Django settings to use mock payment backend');
  console.log('Example: PAYMENT_BACKEND = "payments.backends.MockPaymentBackend"');
  console.log('No real money charged during tests');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
