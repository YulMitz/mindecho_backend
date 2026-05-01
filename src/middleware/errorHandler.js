/**
 * src/middleware/errorHandler.js
 *
 * Centralized Express error handler. Logs to stderr (so the log-rotator
 * captures it) and forwards 5xx errors to Discord via discordAlert().
 *
 * Plug in last: `app.use(errorHandler)`.
 */
import { discordAlert } from '../utils/alert.js';

export const errorHandler = (err, req, res, next) => {
    // eslint-disable-next-line no-unused-vars
    const status = err?.status || err?.statusCode || 500;

    // Always log -- file/Docker capture this.
    // eslint-disable-next-line no-console
    console.error(
        `[error] ${req.method} ${req.originalUrl || req.url} → ${status}`,
        err?.stack || err?.message || err,
    );

    if (status >= 500) {
        // Fire-and-forget; alerter is internally safe.
        discordAlert({
            level: 'error',
            message: `${req.method} ${req.originalUrl || req.url} → ${status}: ${err?.message || 'unknown error'}`,
            error: err,
            context: {
                userId: req.user?.userId || req.user?.id || null,
                ip: req.ip,
            },
        });
    }

    if (res.headersSent) return next(err);
    res.status(status).json({
        message: status >= 500 ? 'Something went wrong!' : err?.message || 'Request failed',
        error: process.env.NODE_ENV === 'production' ? {} : err?.stack,
    });
};

export default errorHandler;
