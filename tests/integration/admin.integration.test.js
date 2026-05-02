import { EventEmitter } from 'node:events';
import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import app from '../../src/app.js';
import { PrismaClient } from '../../prisma-client/index.js';

const prisma = new PrismaClient();

const executeRequest = async (options) => {
    const req = createRequest(options);
    const res = createResponse({ eventEmitter: EventEmitter });
    return new Promise((resolve, reject) => {
        res.on('end', () => resolve(res));
        res.on('error', reject);
        app.handle(req, res);
    });
};

const ts = Date.now();
const aliceUserId = `admin-alice-${ts}`;
const bobUserId = `admin-bob-${ts}`;

const alice = {
    email: `admin-alice-${ts}@example.com`,
    password: 'IntegrationTest123!',
    name: 'Alice Admin',
    dateOfBirth: '1990-01-01',
    gender: 'female',
    educationLevel: 3,
};
const bob = {
    email: `admin-bob-${ts}@example.com`,
    password: 'IntegrationTest123!',
    name: 'Bob NotAdmin',
    dateOfBirth: '1991-02-02',
    gender: 'male',
    educationLevel: 3,
};

let aliceToken = null;
let bobToken = null;
let originalAdminUsernames;

async function registerAndLogin(user, friendlyUserId) {
    await executeRequest({ method: 'POST', url: '/api/auth/register', body: user });
    // Force a known userId so we can put it in ADMIN_USERNAMES.
    await prisma.user.update({
        where: { email: user.email },
        data: { userId: friendlyUserId },
    });
    const res = await executeRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: user.email, password: user.password },
    });
    return res._getJSONData().token;
}

beforeAll(async () => {
    originalAdminUsernames = process.env.ADMIN_USERNAMES;
    aliceToken = await registerAndLogin(alice, aliceUserId);
    bobToken = await registerAndLogin(bob, bobUserId);
    process.env.ADMIN_USERNAMES = aliceUserId;
});

afterAll(async () => {
    if (originalAdminUsernames === undefined) delete process.env.ADMIN_USERNAMES;
    else process.env.ADMIN_USERNAMES = originalAdminUsernames;
    await prisma.$disconnect();
});

describe('admin API auth (integration)', () => {
    test('no token → 401', async () => {
        const res = await executeRequest({ method: 'GET', url: '/api/admin/users' });
        expect(res.statusCode).toBe(401);
    });

    test('non-admin token → 403', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/admin/users',
            headers: { Authorization: `Bearer ${bobToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    test('empty ADMIN_USERNAMES → admin gets 403', async () => {
        const prev = process.env.ADMIN_USERNAMES;
        process.env.ADMIN_USERNAMES = '';
        try {
            const res = await executeRequest({
                method: 'GET',
                url: '/api/admin/users',
                headers: { Authorization: `Bearer ${aliceToken}` },
            });
            expect(res.statusCode).toBe(403);
        } finally {
            process.env.ADMIN_USERNAMES = prev;
        }
    });
});

describe('GET /api/admin/users (integration)', () => {
    test('returns user list with documented fields', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/admin/users',
            headers: { Authorization: `Bearer ${aliceToken}` },
        });
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(Array.isArray(data.users)).toBe(true);
        const userIds = data.users.map((u) => u.userId);
        expect(userIds).toContain(aliceUserId);
        expect(userIds).toContain(bobUserId);
        const a = data.users.find((u) => u.userId === aliceUserId);
        for (const k of [
            'id', 'userId', 'email', 'name', 'isActive',
            'lastLoginAt', 'createdAt', 'dataAnalysisConsent',
            'messageCount', 'sessionCount', 'lastMessageAt',
        ]) {
            expect(a).toHaveProperty(k);
        }
        expect(typeof a.messageCount).toBe('number');
        expect(typeof a.sessionCount).toBe('number');
    });
});

describe('GET /api/admin/llm-stats (integration)', () => {
    test('returns aggregate shape', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/admin/llm-stats',
            headers: { Authorization: `Bearer ${aliceToken}` },
        });
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        for (const k of ['window', 'totals', 'byChatbotType', 'byProvider', 'byDay', 'perUser']) {
            expect(data).toHaveProperty(k);
        }
        expect(typeof data.totals.inputTokens).toBe('number');
        expect(typeof data.totals.outputTokens).toBe('number');
        expect(typeof data.totals.totalTokens).toBe('number');
        expect(typeof data.totals.requestCount).toBe('number');
        expect(typeof data.totals.activeUsers).toBe('number');
        expect(Array.isArray(data.byDay)).toBe(true);
        expect(data.byDay).toHaveLength(30);
    });
});

describe('GET /api/admin/users/:userId/chats (integration)', () => {
    test('returns user + sessions for an existing user', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: `/api/admin/users/${bobUserId}/chats`,
            headers: { Authorization: `Bearer ${aliceToken}` },
        });
        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data.user.userId).toBe(bobUserId);
        expect(Array.isArray(data.sessions)).toBe(true);
        expect(data.pagination).toMatchObject({ page: 1, pageSize: 50 });
        expect(typeof data.pagination.totalSessions).toBe('number');
    });

    test('404 for nonexistent user', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/admin/users/does-not-exist-xyz/chats',
            headers: { Authorization: `Bearer ${aliceToken}` },
        });
        expect(res.statusCode).toBe(404);
    });

    test('clamps pagination params to safe bounds', async () => {
        const res1 = await executeRequest({
            method: 'GET',
            url: `/api/admin/users/${bobUserId}/chats?page=0&pageSize=-1`,
            headers: { Authorization: `Bearer ${aliceToken}` },
        });
        expect(res1.statusCode).toBe(200);
        const data1 = res1._getJSONData();
        expect(data1.pagination.page).toBeGreaterThanOrEqual(1);
        expect(data1.pagination.pageSize).toBeGreaterThanOrEqual(1);

        const res2 = await executeRequest({
            method: 'GET',
            url: `/api/admin/users/${bobUserId}/chats?pageSize=9999`,
            headers: { Authorization: `Bearer ${aliceToken}` },
        });
        expect(res2.statusCode).toBe(200);
        const data2 = res2._getJSONData();
        expect(data2.pagination.pageSize).toBe(200);
    });
});
