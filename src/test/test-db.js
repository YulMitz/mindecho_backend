// test-db.js
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});

async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT version()');
        console.log('Database connected successfully!');
        console.log('PostgreSQL version:', result.rows[0].version);
        client.release();
    } catch (error) {
        console.error('Database connection error:', error);
    } finally {
        await pool.end();
    }
}

testConnection();
