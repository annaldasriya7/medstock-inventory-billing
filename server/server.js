const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server) or matching localhost/deployed frontend
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in development, can restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logger
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'MedStock AI Backend',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/consumption', require('./routes/consumptionRoutes'));
app.use('/api/predictions', require('./routes/predictionRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/branches', require('./routes/branchRoutes'));
app.use('/api/stock-receipts', require('./routes/stockReceiptRoutes'));
app.use('/api/stock-adjustments', require('./routes/stockAdjustmentRoutes'));
app.use('/api/quarantine', require('./routes/quarantineRoutes'));

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found.`
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Always ensure default admin and staff accounts (including riya admin) exist
    const { runManualSeed, ensureDefaultAccounts } = require('./services/seedService');
    await ensureDefaultAccounts();

    // Auto-seed sample medicines if database is empty
    const Medicine = require('./models/Medicine');
    const medCount = await Medicine.countDocuments();
    if (medCount === 0) {
      console.log('[Database] Empty medicine catalog detected. Adding medicines to database...');
      await runManualSeed();
    }

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` MedStock AI Server running on port ${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
