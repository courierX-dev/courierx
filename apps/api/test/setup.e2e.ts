import { beforeAll, afterAll } from 'vitest';

beforeAll(async () => {
    // Setup E2E test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/courierx_test';
});

afterAll(async () => {
    // Cleanup E2E environment
});
