import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load test env vars so Prisma and app get the test DATABASE_URL
const testEnv = dotenv.config({ path: '.env.test' }).parsed ?? {};

export default defineConfig({
    test: {
        include: ['tests/integration/**/*.test.js'],
        globalSetup: './tests/integration/globalSetup.js',
        // Inject env vars into all test worker processes
        env: testEnv,
        // Run integration tests serially to avoid DB race conditions
        pool: 'forks',
        poolOptions: {
            forks: { singleFork: true },
        },
    },
});
