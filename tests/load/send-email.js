import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const emailSendDuration = new Trend('email_send_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'],              // Error rate should be below 10%
    email_send_duration: ['p(95)<1000'], // 95% of email sends below 1s
  },
};

// Test data
const API_KEY = __ENV.API_KEY || 'sk_test_your_api_key_here';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const payload = JSON.stringify({
    from: 'sender@example.com',
    to: `recipient-${__VU}-${__ITER}@example.com`,
    subject: `Load Test Email ${__VU}-${__ITER}`,
    html: '<p>This is a load test email</p>',
    text: 'This is a load test email',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  const response = http.post(`${BASE_URL}/api/v1/messages/send`, payload, params);

  // Record metrics
  emailSendDuration.add(response.timings.duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200 || r.status === 201,
    'has message_id': (r) => JSON.parse(r.body).message_id !== undefined,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);

  sleep(1); // Think time between requests
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
}
