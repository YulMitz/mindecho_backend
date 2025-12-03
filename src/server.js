import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDatabase, closeDatabaseConnections } from './config/database.js';

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

        app.listen(PORT, '127.0.0.1', () => {
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

// Start the server
startServer();