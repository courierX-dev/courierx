import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'your_jwt_token_here';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`,
};

export default function () {
  group('API Health Checks', function () {
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
      'health check returns ok': (r) => JSON.parse(r.body).status === 'ok',
    });
  });

  group('Product Management', function () {
    // List products
    let res = http.get(`${BASE_URL}/api/v1/products`, { headers });
    check(res, {
      'list products status is 200': (r) => r.status === 200,
    });

    sleep(0.5);

    // Get specific product (if any exist)
    const products = JSON.parse(res.body).data;
    if (products && products.length > 0) {
      const productId = products[0].id;
      res = http.get(`${BASE_URL}/api/v1/products/${productId}`, { headers });
      check(res, {
        'get product status is 200': (r) => r.status === 200,
      });
    }
  });

  group('API Key Management', function () {
    const res = http.get(`${BASE_URL}/api/v1/api-keys`, { headers });
    check(res, {
      'list api keys status is 200': (r) => r.status === 200,
    });
  });

  group('Message History', function () {
    const res = http.get(`${BASE_URL}/api/v1/messages?limit=10`, { headers });
    const success = check(res, {
      'list messages status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  });

  sleep(1);
}
