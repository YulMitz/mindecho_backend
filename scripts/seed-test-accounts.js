/**
 * Seed test accounts for the chatbot test webpage.
 * Run from project root: node scripts/seed-test-accounts.js
 *
 * Accounts are idempotent — safe to run multiple times.
 * To add more accounts, extend the TEST_ACCOUNTS array.
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '../prisma-client/index.js';

const prisma = new PrismaClient();

const TEST_ACCOUNTS = [
    {
        email: 'tester1@mindecho.test',
        password: 'testkey001',
        name: 'Tester One',
    },
    {
        email: 'tester2@mindecho.test',
        password: 'testkey002',
        name: 'Tester Two',
    },
];

async function seedAccounts() {
    console.log('Seeding test accounts…\n');

    for (const account of TEST_ACCOUNTS) {
        const existing = await prisma.user.findUnique({ where: { email: account.email } });

        if (existing) {
            console.log(`  ⏭  Already exists: ${account.email}`);
            continue;
        }

        const hashedPassword = await bcrypt.hash(account.password, 12);

        await prisma.user.create({
            data: {
                userId: crypto.randomUUID(),
                email: account.email,
                password: hashedPassword,
                name: account.name,
                dateOfBirth: new Date('2000-01-01'),
                gender: 'unknown',
            },
        });

        console.log(`  ✅ Created: ${account.email}  (key: ${account.password})`);
    }

    console.log('\nDone.');
}

seedAccounts()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
