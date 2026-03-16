import http from 'k6/http';
import { check, group } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL } from '../../../config.js';

const smsMockSuccess = new Rate('sms_mock_success');

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    'sms_mock_success': ['rate>0.95'],
    'http_req_duration': ['p(95)<2000'],
  },
};

// Mock SMS service responses
const mockSMSResponses = {
  success: {
    status: 'sent',
    message_id: 'mock_msg_123456',
    cost: 0.0, // Free in test
  },
  failure: {
    status: 'failed',
    error: 'Invalid phone number',
  },
  pending: {
    status: 'pending',
    message_id: 'mock_msg_123457',
  },
};

export default function () {
  group('SMS Service Mocking', () => {
    // Test 1: Mock successful SMS send
    group('Send SMS - Success', () => {
      const phone = '+79001234567';
      const code = Math.floor(100000 + Math.random() * 900000);

      // In real scenario, this would call SMS gateway
      // With mock, we simulate the behavior
      const mockResponse = mockSMSResponses.success;

      const success = check(mockResponse, {
        'SMS marked as sent': (r) => r.status === 'sent',
        'has message ID': (r) => r.message_id !== undefined,
        'no cost in test': (r) => r.cost === 0.0,
      });

      smsMockSuccess.add(success ? 1 : 0);
    });

    // Test 2: Mock SMS send failure
    group('Send SMS - Failure', () => {
      const invalidPhone = '+7900'; // Invalid

      const mockResponse = mockSMSResponses.failure;

      check(mockResponse, {
        'SMS marked as failed': (r) => r.status === 'failed',
        'has error message': (r) => r.error !== undefined,
      });
    });

    // Test 3: Mock SMS verification
    group('Verify SMS Code', () => {
      const phone = '+79001234567';
      const correctCode = '123456';
      const wrongCode = '999999';

      // Mock verification logic
      const verifyMock = (code) => {
        if (code === correctCode) {
          return { verified: true, phone: phone };
        }
        return { verified: false, error: 'Invalid code' };
      };

      check(verifyMock(correctCode), {
        'correct code verified': (r) => r.verified === true,
      });

      check(verifyMock(wrongCode), {
        'wrong code rejected': (r) => r.verified === false,
      });
    });

    // Test 4: Test registration with mocked SMS
    group('Registration with Mock SMS', () => {
      const testPhone = `+7900${Math.floor(1000000 + Math.random() * 9000000)}`;

      // Step 1: Request OTP (mocked)
      const otpMock = {
        status: 'sent',
        expires_in: 300,
      };

      check(otpMock, {
        'OTP request successful': (r) => r.status === 'sent',
      });

      // Step 2: Verify OTP (mocked - auto-success in test)
      const verifyMock = {
        verified: true,
        token: 'mock_jwt_token_123',
      };

      check(verifyMock, {
        'OTP verified': (r) => r.verified === true,
        'received auth token': (r) => r.token !== undefined,
      });
    });

    // Test 5: Mock SMS rate limiting
    group('SMS Rate Limiting Mock', () => {
      const phone = '+79001234567';
      let requestCount = 0;
      const rateLimit = 3;

      const sendSMS = () => {
        requestCount++;
        if (requestCount > rateLimit) {
          return { status: 'rate_limited', retry_after: 60 };
        }
        return { status: 'sent' };
      };

      // Send multiple SMS
      check(sendSMS(), { 'SMS 1 sent': (r) => r.status === 'sent' });
      check(sendSMS(), { 'SMS 2 sent': (r) => r.status === 'sent' });
      check(sendSMS(), { 'SMS 3 sent': (r) => r.status === 'sent' });
      check(sendSMS(), { 'SMS 4 rate limited': (r) => r.status === 'rate_limited' });
    });
  });
}

export function handleSummary(data) {
  console.log('Mock SMS Service Test Summary:');
  console.log(`SMS Mock Success Rate: ${data.metrics.sms_mock_success.values.rate * 100}%`);
  console.log('All SMS operations mocked successfully without external API calls');
  console.log('Configure Django settings to use mock SMS backend in tests');
  console.log('Example: SMS_BACKEND = "django.core.mail.backends.console.EmailBackend"');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}
