require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const trackingRoutes = require('./routes/tracking');
const customsRoutes = require('./routes/customs');
const uploadRoutes = require('./routes/upload');
const wireRoutes = require('./routes/wire');
const analyticsRoutes = require('./routes/analytics');
const portalRoutes = require('./routes/portal');
const affiliateRoutes = require('./routes/affiliate');
const passwordResetRoutes = require('./routes/password-reset');
const contactRoutes = require('./routes/contact');


const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
db.exec(initSQL, (err) => {
    if (err) {
        console.error('Database initialization error:', err.message);
    } else {
        console.log('✅ Database initialized successfully');
    }
});

app.locals.db = db;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/customs', customsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wire', wireRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/contact', contactRoutes);



// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
    console.log(`🚀 Dropship Forwarder API running on http://localhost:${PORT}`);
    console.log(`📁 Database: ${dbPath}`);
});

process.on('SIGINT', () => {
    db.close();
    process.exit();
});

module.exports = { db };