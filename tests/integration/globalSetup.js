import { execSync } from 'child_process';
import { config } from 'dotenv';

export async function setup() {
    // Explicitly parse .env.test so DATABASE_URL is always the test DB,
    // regardless of what process.env currently contains.
    const testEnv = config({ path: '.env.test' }).parsed ?? {};
    const testDbUrl = testEnv.DATABASE_URL;

    if (!testDbUrl) {
        throw new Error('[integration setup] DATABASE_URL not found in .env.test — aborting.');
    }

    // Safety guard: refuse to force-reset anything that isn't the test database.
    if (!testDbUrl.includes('5555') && !testDbUrl.includes('mindecho_test')) {
        throw new Error(
            `[integration setup] DATABASE_URL does not look like the test DB (expected port 5555 or "mindecho_test").\n` +
            `Got: ${testDbUrl}\nAborting to prevent accidental data loss.`,
        );
    }

    const safeEnv = {
        ...process.env,
        DATABASE_URL: testDbUrl,
        // Required by Prisma when an AI agent runs --force-reset
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
    };

    console.log('\n[integration setup] Running prisma db push on test database...');
    execSync('npx prisma db push --schema prisma --force-reset', {
        env: safeEnv,
        stdio: 'inherit',
    });

    console.log('[integration setup] Seeding scales...');
    execSync('npx prisma db execute --schema prisma --file prisma/seed_scales.sql', {
        env: safeEnv,
        stdio: 'inherit',
    });

    console.log('[integration setup] Test database ready.\n');
}

export async function teardown() {
    // Tables are left in place so you can inspect failures.
    // Run `docker compose -f docker-compose.test.yml down -v` to wipe.
    console.log('[integration teardown] Done.');
}
