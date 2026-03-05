import { EventEmitter } from 'node:events';
import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import app from '../../src/app.js';

// .env.test is loaded by vitest.integration.config.js before this file runs

const executeRequest = async (options) => {
    const req = createRequest(options);
    const res = createResponse({ eventEmitter: EventEmitter });

    return new Promise((resolve, reject) => {
        res.on('end', () => resolve(res));
        res.on('error', reject);
        app.handle(req, res);
    });
};

// Shared state across tests in this file
let authToken = null;
const testUser = {
    email: `integration-test-${Date.now()}@example.com`,
    password: 'IntegrationTest123!',
    firstName: 'Integration',
    lastName: 'Test',
    dateOfBirth: '1995-06-15',
    gender: 'male',
    educationLevel: 3,
    // emergencyContacts array is required by the register controller (1-3 items)
    emergencyContacts: [
        { name: 'Emergency Contact', relation: 'Friend', contactInfo: '0911111111' },
    ],
    supportContactName: 'Support Person',
    supportContactInfo: '0911111111',
    familyContactName: 'Family Person',
    familyContactInfo: '0922222222',
};

// ============================================
// Auth Integration Tests (real DB)
// ============================================

describe('POST /api/auth/register (integration)', () => {
    test('should create a new user and return 201', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/auth/register',
            body: testUser,
        });

        expect(res.statusCode).toBe(201);
        expect(res._isJSON()).toBe(true);

        const data = res._getJSONData();
        // register returns { message, user } — token is obtained via login
        expect(data).toHaveProperty('user');
        expect(data.user.email).toBe(testUser.email);
    });

    test('should return 400 when registering the same email twice', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/auth/register',
            body: testUser,
        });

        expect(res.statusCode).toBe(400);
    });

    test('should return 400 when required field is missing', async () => {
        const { firstName, ...withoutFirstName } = testUser;

        const res = await executeRequest({
            method: 'POST',
            url: '/api/auth/register',
            body: { ...withoutFirstName, email: `missing-field-${Date.now()}@example.com` },
        });

        expect(res.statusCode).toBe(400);
    });
});

describe('POST /api/auth/login (integration)', () => {
    test('should return 200 and a valid token with correct credentials', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: testUser.email, password: testUser.password },
        });

        expect(res.statusCode).toBe(200);
        expect(res._isJSON()).toBe(true);

        const data = res._getJSONData();
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('userData');
        expect(data.userData.email).toBe(testUser.email);
        expect(data.userData.firstName).toBe(testUser.firstName);

        // Save token for downstream tests
        authToken = data.token;
    });

    test('should return 401 with wrong password', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: testUser.email, password: 'wrongpassword' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should return 400/401 with non-existent email', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: 'nobody@nowhere.com', password: 'anything' },
        });

        expect([400, 401]).toContain(res.statusCode);
    });
});

describe('GET /api/user/profile (integration)', () => {
    test('should return 200 and user profile with valid token', async () => {
        // This test depends on authToken set by the login test above
        if (!authToken) {
            console.warn('Skipping: no authToken (login test may have failed)');
            return;
        }

        const res = await executeRequest({
            method: 'GET',
            url: '/api/user/profile',
            headers: { Authorization: `Bearer ${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res._isJSON()).toBe(true);

        const data = res._getJSONData();
        expect(data).toHaveProperty('user');
        expect(data.user.email).toBe(testUser.email);
    });

    test('should return 401 with no token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/user/profile',
        });

        expect(res.statusCode).toBe(401);
    });
});
