import { beforeAll } from 'vitest';
import { setupTestDatabase } from './test-database.setup';

// Set test database URL if not already set
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/courierx_test';
}

// Ensure we're in test mode
process.env.NODE_ENV = 'test';

// Set test secrets
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

// Setup test database before running tests
beforeAll(async () => {
    try {
        await setupTestDatabase();
    } catch (error) {
        console.warn('⚠️ Could not setup test database. Tests may fail if database is not available.');
        console.warn('To run integration tests, ensure PostgreSQL is running and accessible.');
    }
});
