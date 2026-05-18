require('dotenv').config(); // Loads environment variables from .env
const express = require('express');
const connectDB = require('./config/db');
const corsMiddleware = require('./middleware/cors');
const clientsRoutes = require('./routes/clients');
const messageRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const { startAutomationJobs } = require('./jobs/automation');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(corsMiddleware);
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

app.use('/api/clients', clientsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
});

startAutomationJobs();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
