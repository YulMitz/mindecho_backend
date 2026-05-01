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

// Top-level safety nets — surface to Discord, log to stderr, then bail.
process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[unhandledRejection]', err.stack || err.message);
    discordAlert({ level: 'error', message: `unhandledRejection: ${err.message}`, error: err });
});

process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err?.stack || err?.message || err);
    // Fire alert, but don't block exit forever.
    discordAlert({ level: 'error', message: `uncaughtException: ${err?.message || err}`, error: err });
    setTimeout(() => process.exit(1), 500).unref?.();
});

// Start the server
startServer();