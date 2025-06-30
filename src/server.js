const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});