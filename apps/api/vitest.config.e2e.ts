import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        name: 'e2e',
        root: '.',
        testTimeout: 30000,
        include: ['test/**/*.e2e-spec.ts', 'test/**/*.integration.spec.ts'],
        globals: true,
        environment: 'node',
        setupFiles: ['test/setup.ts'],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
});
