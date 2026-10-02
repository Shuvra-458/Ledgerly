require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const { protect } = require('./middleware/authMiddleware');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardController = require('./controllers/dashboardController');
const reviewRoutes = require('./routes/reviewRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Root — route based on auth state
app.get('/', (req, res) =>
  req.cookies?.token ? res.redirect('/dashboard') : res.redirect('/login')
);

// Auth routes
app.use('/', authRoutes);

// Protected: dashboard
app.get('/dashboard', protect, dashboardController.showDashboard);

app.use('/transactions', transactionRoutes);

app.use('/reviews', reviewRoutes);

app.use('/profile', profileRoutes);

app.use((req, res, next) => {
  res.locals.currencySymbol = '$';
  next();
});



// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => process.exit(0));
  });
});