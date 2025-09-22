import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Client, Pool } from 'pg';

// 在模塊級別定義連接對象
let pool = null;
let client = null;

// PostgreSQL 連接初始化
const initializePGConnection = () => {
    if (process.env.NODE_ENV === 'production') {
        pool = new Pool({
            host: 'localhost',
            port: process.env.PG_PORT || 5432,
            database: process.env.PG_DATABASE,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    } else {
        client = new Client({
            host: 'localhost',
            port: process.env.PG_PORT || 5432,
            database: process.env.PG_DATABASE,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
        });
    }
};

// Connect to PostgreSQL database
const connectPGSL = async () => {
    try {
        // 初始化連接對象
        initializePGConnection();
        
        if (process.env.NODE_ENV === 'production' && pool) {
            // 測試連接池
            const testResult = await pool.query('SELECT NOW()');
            console.log('PostgreSQL Pool connected:', testResult.rows[0].now);
            console.log('Connected to PostgreSQL database in production mode');
        } else if (process.env.NODE_ENV === 'development' && client) {
            // 連接客戶端
            await client.connect();
            const testResult = await client.query('SELECT NOW()');
            console.log('PostgreSQL Client connected:', testResult.rows[0].now);
            console.log('Connected to PostgreSQL database in development mode');
        }
    } catch (err) {
        console.error('Error connecting to PostgreSQL database:', err);
        throw err; // 重新拋出錯誤以便上層處理
    }
};

// MongoDB 連接函數
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw error; // 重新拋出錯誤
    }
};

// 獲取 PostgreSQL 連接的輔助函數
const getPGConnection = () => {
    if (process.env.NODE_ENV === 'production') {
        return pool;
    } else {
        return client;
    }
};

// 優雅關閉數據庫連接
const closeDatabaseConnections = async () => {
    try {
        // 關閉 MongoDB 連接
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        
        // 關閉 PostgreSQL 連接
        if (pool) {
            await pool.end();
            console.log('PostgreSQL pool closed');
        }
        if (client) {
            await client.end();
            console.log('PostgreSQL client closed');
        }
    } catch (error) {
        console.error('Error closing database connections:', error);
    }
};

// 修正：使用命名導出
export { connectDB, connectPGSL, getPGConnection, closeDatabaseConnections };
