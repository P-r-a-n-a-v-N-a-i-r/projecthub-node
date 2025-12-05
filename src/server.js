import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/usersRoutes.js';
import authMiddleware from './middleware/authMiddleware.js';
import metricsRoutes from './routes/metricsRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import './utils/taskReminders.js'; // or require('./utils/taskReminders') if using CommonJS



dotenv.config();

// Connect to MongoDB before starting the server
await connectDB();

const app = express();

// CORS (adjust origin as needed for prod)
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/users/invite', inviteRoutes);
app.use('/api/tasks',authMiddleware, taskRoutes);
app.use('/api/activity', activityRoutes);


app.use('/api/metrics',authMiddleware, metricsRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
