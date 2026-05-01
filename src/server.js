import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDatabase, closeDatabaseConnections } from './config/database.js';
import { discordAlert } from './utils/alert.js';

let PORT;

if (process.env.NODE_ENV === 'development') {
    PORT = process.env.DEV_PORT;
} else if (process.env.NODE_ENV === 'production') {
    PORT = process.env.PROD_PORT;
} else { 
    console.warn(
        'NODE_ENV is not set to development or production. Defaulting to development settings.'
    );
    PORT = process.env.DEV_PORT;
}

const startServer = async () => {
    try {
        // Connect to database via Prisma
        await connectDatabase();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(
                `Express server running on ${PORT} in ${process.env.NODE_ENV} mode`
            );
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Terminate server gracefully on SIGTERM or SIGINT
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await closeDatabaseConnections();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await closeDatabaseConnections();
    process.exit(0);
});

// Top-level safety nets — surface to Discord, log to stderr, then exit so
// Docker can restart the container into a known-good state. Node's default
// for unhandledRejection is also to terminate (since v15) -- we just give
// the alert a brief window to flush before going down.
const fatalExit = (kind, err) => {
    console.error(`[${kind}]`, err?.stack || err?.message || err);
    try {
        discordAlert({ level: 'error', message: `${kind}: ${err?.message || err}`, error: err });
    } catch {}
    setTimeout(() => process.exit(1), 500).unref?.();
};

process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    fatalExit('unhandledRejection', err);
});

process.on('uncaughtException', (err) => {
    fatalExit('uncaughtException', err);
});

// Start the server
startServer();