import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../../prisma-client/index.js';

// Prisma singleton pattern
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Initialize Prisma connection
const connectDatabase = async () => {
    try {
        await prisma.$connect();
        console.log('Connected to PostgreSQL database via Prisma');
    } catch (err) {
        console.error('Error connecting to database:', err);
        throw err;
    }
};

// Gracefully close database connection
const closeDatabaseConnections = async () => {
    try {
        await prisma.$disconnect();
        console.log('Prisma connection closed');
    } catch (error) {
        console.error('Error closing database connection:', error);
    }
};

export { connectDatabase, closeDatabaseConnections, prisma };
export default prisma;
