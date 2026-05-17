require('dotenv').config(); // Loads environment variables from .env
const express = require('express');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Sample Route
app.get('/', (req, res) => {
  res.send('API is running and database is connected!');
});

// API route used by the frontend
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend is connected',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
