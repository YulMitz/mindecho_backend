/**
 * src/utils/alert.js
 *
 * Tiny Discord-webhook alerter used by the prod backend's error paths.
 *
 * Behavior:
 *   - No-op unless NODE_ENV === 'production' AND DISCORD_ALERT_WEBHOOK_URL is set.
 *   - Dedupes identical alerts within DEDUPE_WINDOW_MS; flushes a `↺ repeated N×`
 *     follow-up at end of window.
 *   - Throttles sends to MIN_INTERVAL_MS apart and caps at MAX_PER_MINUTE.
 *   - On overflow drops further alerts and emits a single "alert overflow" notice.
 *   - Honors HTTP 429 Retry-After.
 *
 * Designed to never throw out of `discordAlert(...)` -- alerting must not
 * compound failures.
 */
import crypto from 'node:crypto';
import os from 'node:os';

// ─── Tunables (env-overridable for tests) ──────────────────────────────────
const DEDUPE_WINDOW_MS = Number(process.env.ALERT_DEDUPE_WINDOW_MS || 60_000);
const MIN_INTERVAL_MS = Number(process.env.ALERT_MIN_INTERVAL_MS || 2_000);
const MAX_PER_MINUTE = Number(process.env.ALERT_MAX_PER_MINUTE || 50);
const PER_MINUTE_WINDOW_MS = 60_000;
const MAX_DESCRIPTION_CHARS = 4000;

const LEVEL_EMOJI = { info: 'ℹ️', warn: '⚠️', error: '🚨' };
const LEVEL_COLOR = { info: 0x3498db, warn: 0xf1c40f, error: 0xe74c3c };

// ─── State (module-scoped; small, ephemeral) ───────────────────────────────
const dedupeMap = new Map(); // fingerprint → { count, firstSeenAt, timer, sample }
const sendTimestamps = []; // sliding window of recent send timestamps
let lastSendAt = 0;
let queue = Promise.resolve();
let nextAvailableAt = 0; // honors Retry-After
let overflowNoticeSent = false;

const isEnabled = () =>
    process.env.NODE_ENV === 'production' && !!process.env.DISCORD_ALERT_WEBHOOK_URL;

const fingerprint = ({ level, message, error }) =>
    crypto
        .createHash('sha1')
        .update([level, message, error?.code || '', error?.name || ''].join('|'))
        .digest('hex');

const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

const buildPayload = ({ level, message, error, context, repeatCount }) => {
    const lvl = (level || 'info').toLowerCase();
    const desc = String(message ?? '').slice(0, MAX_DESCRIPTION_CHARS);
    const fields = [
        { name: 'host', value: os.hostname(), inline: true },
        { name: 'time', value: new Date().toISOString(), inline: true },
    ];
    if (error?.stack) {
        fields.push({
            name: 'stack',
            value: '```\n' + String(error.stack).slice(0, 1000) + '\n```',
        });
    }
    if (context && typeof context === 'object') {
        for (const [k, v] of Object.entries(context)) {
            fields.push({
                name: String(k).slice(0, 256),
                value: String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 1024),
                inline: true,
            });
        }
    }
    let title = `${LEVEL_EMOJI[lvl] || ''} ${lvl.toUpperCase()}`.trim();
    if (repeatCount && repeatCount > 1) {
        title += `  ↺ repeated ${repeatCount}×`;
    }
    return {
        embeds: [
            {
                title,
                description: desc || '(no message)',
                color: LEVEL_COLOR[lvl] || 0x95a5a6,
                fields,
            },
        ],
    };
};

const enforceWindowCap = () => {
    const now = Date.now();
    while (sendTimestamps.length && now - sendTimestamps[0] > PER_MINUTE_WINDOW_MS) {
        sendTimestamps.shift();
    }
    return sendTimestamps.length < MAX_PER_MINUTE;
};

const doFetch = async (payload) => {
    const url = process.env.DISCORD_ALERT_WEBHOOK_URL;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.status === 429) {
            const retryHeader = res.headers.get?.('retry-after') || res.headers.get?.('Retry-After');
            const retrySec = Number(retryHeader);
            const delayMs = Number.isFinite(retrySec) ? retrySec * 1000 : 5_000;
            nextAvailableAt = Date.now() + delayMs;
            // Re-enqueue the same payload after the delay.
            queue = queue.then(() => sleep(delayMs)).then(() => doFetch(payload));
            return;
        }
        if (!res.ok) {
            // Don't throw -- alert path must be safe.
            // eslint-disable-next-line no-console
            console.error(`[alert] discord webhook returned ${res.status}`);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[alert] discord webhook fetch failed:', err?.message || err);
    }
};

const enqueueSend = (payload) => {
    queue = queue
        .then(async () => {
            const now = Date.now();
            const waitFor = Math.max(
                nextAvailableAt - now,
                lastSendAt + MIN_INTERVAL_MS - now,
                0,
            );
            if (waitFor > 0) await sleep(waitFor);
            lastSendAt = Date.now();
            sendTimestamps.push(lastSendAt);
            await doFetch(payload);
        })
        .catch(() => {});
    return queue;
};

/**
 * Send an alert. Safe to await or fire-and-forget.
 * @param {{level?: 'info'|'warn'|'error', message: string, error?: Error, context?: object}} opts
 * @returns {Promise<void>}
 */
export const discordAlert = (opts = {}) => {
    if (!isEnabled()) return Promise.resolve();
    try {
        const fp = fingerprint(opts);
        const existing = dedupeMap.get(fp);

        if (existing) {
            existing.count += 1;
            return Promise.resolve();
        }

        if (!enforceWindowCap()) {
            if (!overflowNoticeSent) {
                overflowNoticeSent = true;
                enqueueSend(
                    buildPayload({
                        level: 'warn',
                        message: `⚠ alert overflow — dropping further alerts (cap ${MAX_PER_MINUTE}/min)`,
                    }),
                );
                setTimeout(() => {
                    overflowNoticeSent = false;
                }, PER_MINUTE_WINDOW_MS).unref?.();
            }
            return Promise.resolve();
        }

        // Schedule end-of-window follow-up if any repeats accumulated.
        const sample = { ...opts };
        const entry = { count: 1, firstSeenAt: Date.now(), sample, timer: null };
        entry.timer = setTimeout(() => {
            const finalCount = entry.count;
            dedupeMap.delete(fp);
            if (finalCount > 1) {
                enqueueSend(buildPayload({ ...sample, repeatCount: finalCount }));
            }
        }, DEDUPE_WINDOW_MS);
        entry.timer.unref?.();
        dedupeMap.set(fp, entry);

        return enqueueSend(buildPayload(opts));
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[alert] internal error:', err?.message || err);
        return Promise.resolve();
    }
};

/** Test-only: reset internal state. */
export const __resetAlertStateForTests = () => {
    for (const e of dedupeMap.values()) clearTimeout(e.timer);
    dedupeMap.clear();
    sendTimestamps.length = 0;
    lastSendAt = 0;
    nextAvailableAt = 0;
    overflowNoticeSent = false;
    queue = Promise.resolve();
};

export default discordAlert;
