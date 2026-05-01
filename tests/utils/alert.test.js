/**
 * tests/utils/alert.test.js
 *
 * Verifies Discord alerter behavior without ever hitting the real webhook.
 * fetch() is replaced with a vi.fn stub.
 */
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

const FAKE_URL = 'https://discord.test/api/webhooks/fake';

let fetchMock;

const setProdEnv = () => {
    process.env.NODE_ENV = 'production';
    process.env.DISCORD_ALERT_WEBHOOK_URL = FAKE_URL;
    // Tighten timing so tests stay fast.
    process.env.ALERT_DEDUPE_WINDOW_MS = '100';
    process.env.ALERT_MIN_INTERVAL_MS = '20';
    process.env.ALERT_MAX_PER_MINUTE = '5';
};

const setDevEnv = () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DISCORD_ALERT_WEBHOOK_URL;
};

const okResponse = () => ({ ok: true, status: 204, headers: { get: () => null } });

const importFresh = async () => {
    vi.resetModules();
    return await import('../../src/utils/alert.js');
};

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve(okResponse()));
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('discordAlert — disabled environments', () => {
    test('does nothing in development', async () => {
        setDevEnv();
        const { discordAlert } = await importFresh();
        await discordAlert({ level: 'error', message: 'boom' });
        await tick(30);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('does nothing when webhook URL is missing', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.DISCORD_ALERT_WEBHOOK_URL;
        const { discordAlert } = await importFresh();
        await discordAlert({ level: 'error', message: 'boom' });
        await tick(30);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('discordAlert — production behavior', () => {
    test('first occurrence sends immediately', async () => {
        setProdEnv();
        const { discordAlert, __resetAlertStateForTests } = await importFresh();
        __resetAlertStateForTests();

        await discordAlert({ level: 'error', message: 'first error' });
        await tick(80);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, opts] = fetchMock.mock.calls[0];
        expect(url).toBe(FAKE_URL);
        expect(opts.method).toBe('POST');
        const body = JSON.parse(opts.body);
        expect(body.embeds?.[0]?.description).toBe('first error');
    });

    test('repeats within window are suppressed; follow-up "↺ repeated N×" fires', async () => {
        setProdEnv();
        const { discordAlert, __resetAlertStateForTests } = await importFresh();
        __resetAlertStateForTests();

        await discordAlert({ level: 'warn', message: 'flap' });
        await discordAlert({ level: 'warn', message: 'flap' });
        await discordAlert({ level: 'warn', message: 'flap' });
        await tick(80);
        // Only the original send so far.
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Wait past dedupe window (100ms) + min interval flush.
        await tick(180);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const followUp = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(followUp.embeds[0].title).toMatch(/repeated\s+3×/);
    });

    test('rapid distinct alerts are throttled ≥ MIN_INTERVAL_MS apart', async () => {
        setProdEnv();
        const { discordAlert, __resetAlertStateForTests } = await importFresh();
        __resetAlertStateForTests();

        const calledAt = [];
        fetchMock.mockImplementation(() => {
            calledAt.push(Date.now());
            return Promise.resolve(okResponse());
        });

        await Promise.all([
            discordAlert({ level: 'error', message: 'a' }),
            discordAlert({ level: 'error', message: 'b' }),
            discordAlert({ level: 'error', message: 'c' }),
        ]);
        await tick(150);

        expect(calledAt.length).toBe(3);
        const gap1 = calledAt[1] - calledAt[0];
        const gap2 = calledAt[2] - calledAt[1];
        // Allow tiny scheduler slop.
        expect(gap1).toBeGreaterThanOrEqual(15);
        expect(gap2).toBeGreaterThanOrEqual(15);
    });

    test('over-cap traffic is dropped with a one-shot overflow notice', async () => {
        setProdEnv();
        // ALERT_MAX_PER_MINUTE = 5
        const { discordAlert, __resetAlertStateForTests } = await importFresh();
        __resetAlertStateForTests();

        for (let i = 0; i < 12; i++) {
            await discordAlert({ level: 'error', message: `msg-${i}` });
        }
        await tick(400);

        // 5 real sends + 1 overflow notice = 6
        expect(fetchMock).toHaveBeenCalledTimes(6);
        const last = JSON.parse(fetchMock.mock.calls[5][1].body);
        expect(last.embeds[0].description).toMatch(/overflow/i);
    });

    test('honors HTTP 429 Retry-After (delays retry)', async () => {
        setProdEnv();
        const { discordAlert, __resetAlertStateForTests } = await importFresh();
        __resetAlertStateForTests();

        let call = 0;
        const callTimes = [];
        fetchMock.mockImplementation(() => {
            callTimes.push(Date.now());
            call += 1;
            if (call === 1) {
                return Promise.resolve({
                    ok: false,
                    status: 429,
                    headers: { get: (h) => (h.toLowerCase() === 'retry-after' ? '1' : null) },
                });
            }
            return Promise.resolve(okResponse());
        });

        await discordAlert({ level: 'error', message: 'rate-limited' });
        await tick(1300);

        expect(call).toBeGreaterThanOrEqual(2);
        const gap = callTimes[1] - callTimes[0];
        expect(gap).toBeGreaterThanOrEqual(900); // ~1s retry-after
    });
});
