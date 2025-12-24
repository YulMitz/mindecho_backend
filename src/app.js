import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Load .env
import dotenv from 'dotenv';
dotenv.config();

import authRoute from './routes/auth.js';
import userRoute from './routes/users.js';
import mainRoute from './routes/main.js';
import chatRoute from './routes/chat.js';
import diaryRoute from './routes/diary.js';
// import analysisRoute from './routes/analysis.js';
import path from 'path';

const app = express();

app.set('trust proxy', 1); // Trust first proxy for secure headers

// Security middleware
/*
    - Helmet helps you secure your Express apps by setting various HTTP headers.
    - ex. some useful protection options:
    - X-Frame-Options: DENY, prevents the page from clickjacking attacks.
    - X-XSS-Protection: 1; mode=block, enables the XSS filter in browsers.
    - Strict-Transport-Security: max-age=31536000; includeSubDomains, enforces HTTPS.
*/
app.use(helmet());
/*
    - CORS (Cross-Origin Resource Sharing) allows your server to specify who can access its resources.
    - In development, allowing all origins is fine.
    - In production, you should set options for example:
    - origins: ["https://frontenddomain.com", ..."]
    - methods: ["GET", "POST", "PUT", "DELETE"]
    - credentials: true, if you need to allow cookies or HTTP authentication.
    - allowHeaders: ["Content-Type", "Authorization", ...], for common headers.
*/
app.use(
    cors({
        origin:
            process.env.NODE_ENV === 'development'
                ? '*'
                : process.env.CORS_ORIGIN,
    })
);

// Logging
/*
    - Morgan is a logging middleware for Node.js HTTP servers.
    - combined format is a standard Apache log format for example:
    - ::1 - - [25/Jul/2025:10:30:45 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
*/
app.use(morgan('combined'));

// Body parsing middleware
/*
    - express.json() parses incoming requests with JSON payloads.
    - express.urlencoded() parses incoming requests with URL-encoded payloads.
    - limit: '10mb' allows larger payloads, useful for file uploads.
*/
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/main', mainRoute);
app.use('/api/chat', chatRoute);
app.use('/api/diary', diaryRoute);
// app.use('/api/analysis', analysisRoute);

// Test api
app.get('/api/alive', (req, res) => {
    console.log("alive")
    res.json({ message: `Server is alive in ${process.env.NODE_ENV} mode.` });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack,
    });
});

export default app;
