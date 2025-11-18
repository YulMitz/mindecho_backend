import { EventEmitter } from 'node:events';
import { beforeAll, describe, expect, test } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import app from '../src/app.js';

beforeAll(() => {
    process.env.NODE_ENV = 'test';
});

const executeRequest = async (options) => {
    const req = createRequest(options);
    const res = createResponse({ eventEmitter: EventEmitter });

    return new Promise((resolve, reject) => {
        res.on('end', () => resolve(res));
        res.on('error', reject);
        app.handle(req, res);
    });
};

describe('GET /api/alive', () => {
    test('responds with a 200 status and JSON payload', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/alive',
        });

        expect(res.statusCode).toBe(200);
        expect(res._isJSON()).toBe(true);
    });

    test('returns mode-specific message', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/alive',
        });

        expect(res._getJSONData()).toEqual({
            message: 'Server is alive in test mode.',
        });
    });
});
