#!/usr/bin/env node
/**
 * Tiny stdin-line rotator (no deps).
 *
 * Reads from stdin (server's combined stdout+stderr), writes each line to:
 *   1. A dated file `${LOG_DIR}/backend-prod-YYYY-MM-DD.log` (UTC date)
 *   2. Its own stdout (so `docker logs` keeps working)
 *
 * Every 30s it checks whether the UTC date has changed; if so it closes the
 * old file, opens the new dated file, refreshes the `current.log` symlink,
 * and prunes any `backend-prod-*.log` older than 7 days.
 *
 * Errors inside the rotator are caught so a single bad line never tears the
 * pipeline down; only catastrophic stdin/EPIPE failures cause exit.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const LOG_DIR = process.env.LOG_DIR || '/app/logs';
const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS || 7);
const ROLLOVER_CHECK_MS = 30_000;
const FILE_PREFIX = 'backend-prod-';
const FILE_SUFFIX = '.log';
const CURRENT_LINK = path.join(LOG_DIR, 'current.log');

fs.mkdirSync(LOG_DIR, { recursive: true });

const utcDateString = (d = new Date()) => d.toISOString().slice(0, 10); // YYYY-MM-DD

let currentDate = utcDateString();
let currentPath = path.join(LOG_DIR, `${FILE_PREFIX}${currentDate}${FILE_SUFFIX}`);
let currentStream = fs.createWriteStream(currentPath, { flags: 'a' });

const refreshSymlink = () => {
    try {
        if (fs.existsSync(CURRENT_LINK) || fs.lstatSync(CURRENT_LINK, { throwIfNoEntry: false })) {
            try { fs.unlinkSync(CURRENT_LINK); } catch {}
        }
        fs.symlinkSync(path.basename(currentPath), CURRENT_LINK);
    } catch (err) {
        // Symlinks may fail on non-POSIX volumes -- non-fatal.
        process.stderr.write(`[log-rotator] symlink refresh failed: ${err.message}\n`);
    }
};
refreshSymlink();

const pruneOldFiles = () => {
    try {
        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        for (const name of fs.readdirSync(LOG_DIR)) {
            if (!name.startsWith(FILE_PREFIX) || !name.endsWith(FILE_SUFFIX)) continue;
            const dateStr = name.slice(FILE_PREFIX.length, -FILE_SUFFIX.length);
            // Only parse YYYY-MM-DD-shaped names; ignore anything else.
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
            const ts = Date.parse(dateStr + 'T00:00:00Z');
            if (Number.isFinite(ts) && ts < cutoff) {
                try { fs.unlinkSync(path.join(LOG_DIR, name)); } catch {}
            }
        }
    } catch (err) {
        process.stderr.write(`[log-rotator] prune failed: ${err.message}\n`);
    }
};

const rolloverIfNeeded = () => {
    try {
        const today = utcDateString();
        if (today === currentDate) return;
        const oldStream = currentStream;
        currentDate = today;
        currentPath = path.join(LOG_DIR, `${FILE_PREFIX}${currentDate}${FILE_SUFFIX}`);
        currentStream = fs.createWriteStream(currentPath, { flags: 'a' });
        oldStream.end();
        refreshSymlink();
        pruneOldFiles();
    } catch (err) {
        process.stderr.write(`[log-rotator] rollover failed: ${err.message}\n`);
    }
};

const checkInterval = setInterval(rolloverIfNeeded, ROLLOVER_CHECK_MS);
checkInterval.unref?.();
// Initial prune on startup.
pruneOldFiles();

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line) => {
    try {
        // Cheap guard in case interval drifted.
        if (utcDateString() !== currentDate) rolloverIfNeeded();
        currentStream.write(line + '\n');
        process.stdout.write(line + '\n');
    } catch (err) {
        process.stderr.write(`[log-rotator] line write failed: ${err.message}\n`);
    }
});

const shutdown = (code = 0) => {
    clearInterval(checkInterval);
    try { currentStream.end(); } catch {}
    process.exit(code);
};

rl.on('close', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
process.on('uncaughtException', (err) => {
    process.stderr.write(`[log-rotator] fatal: ${err.stack || err.message}\n`);
    shutdown(1);
});
