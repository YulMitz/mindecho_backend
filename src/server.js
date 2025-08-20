import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/database.js';

const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Express server running on ${PORT} in ${process.env.NODE_ENV} mode`);
});