import { execSync } from 'child_process';
import { config } from 'dotenv';

export async function setup() {
    // Load test env so Prisma CLI picks up the correct DATABASE_URL
    config({ path: '.env.test' });

    console.log('\n[integration setup] Running prisma db push on test database...');
    execSync('npx prisma db push --schema prisma --accept-data-loss', {
        env: process.env,
        stdio: 'inherit',
    });

    console.log('[integration setup] Seeding scales...');
    execSync('npx prisma db execute --schema prisma --file prisma/seed_scales.sql', {
        env: process.env,
        stdio: 'inherit',
    });

    console.log('[integration setup] Test database ready.\n');
}

export async function teardown() {
    // Tables are left in place so you can inspect failures.
    // Run `docker compose -f docker-compose.test.yml down -v` to wipe.
    console.log('[integration teardown] Done.');
}
