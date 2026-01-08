import http from 'k6/http';
import { check } from 'k6';

// Stress test - push system to its limits
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '5m', target: 300 },   // Stay at 300 users
    { duration: '10m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'],  // 99% of requests should be below 3s
    http_req_failed: ['rate<0.2'],      // Less than 20% of requests should fail
  },
};

const API_KEY = __ENV.API_KEY || 'sk_test_your_api_key_here';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const payload = JSON.stringify({
    from: 'stress-test@example.com',
    to: `user-${__VU}-${__ITER}@example.com`,
    subject: 'Stress Test Email',
    html: '<p>Testing system under stress</p>',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  const response = http.post(`${BASE_URL}/api/v1/messages/send`, payload, params);

  check(response, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}
