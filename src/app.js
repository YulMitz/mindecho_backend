import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoute from './routes/auth.js';
import userRoute from './routes/users.js';
import mainRoute from './routes/main.js';
import chatRoute from './routes/chat.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors()); // This should only allow app's domain in production

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/main', mainRoute);
app.use('/api/chat', chatRoute);

// Test api
app.get('/test', (req, res) => {
  res.json({ message: 'Basic test working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

export default app;