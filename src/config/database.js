import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Client, Pool } from 'pg';

if (process.env.NODE_ENV === 'production') {
    const pool = new Pool({
        host: 'localhost',
        port: process.env.PG_PORT,
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('PostgreSQL connection error:', err);
        } else {
            console.log('PostgreSQL connected:', res.rows[0].now);
        }
    });
} else if (process.env.NODE_ENV === 'development') {
    const client = new Client({
        host: 'localhost',
        port: process.env.PG_PORT,
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
    });
}

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
};

export default connectDB;
