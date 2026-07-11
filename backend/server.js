require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Dropship Forwarder Backend...');

// ===== DATABASE SETUP =====
const dbPath = path.join(__dirname, 'database.sqlite');

// Create database file if it doesn't exist
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    console.log('✅ Database file created');
}

const db = new sqlite3.Database(dbPath);

// Initialize tables
const initSQL = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    wallet_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    trial_started TEXT,
    trial_ends TEXT,
    trial_used INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT,
    shipping_postal TEXT,
    shipping_country TEXT DEFAULT 'South Africa',
    product_name TEXT NOT NULL,
    product_sku TEXT,
    product_value REAL NOT NULL,
    product_weight_kg REAL NOT NULL,
    product_hs_code TEXT,
    status TEXT DEFAULT 'pending',
    tracking_number TEXT,
    carrier TEXT,
    duties_paid REAL DEFAULT 0,
    ddp_enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tracking_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    event_time TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS hs_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hs_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    duty_rate REAL DEFAULT 0,
    vat_rate REAL DEFAULT 15,
    requires_sabs INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS proof_of_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    transaction_id INTEGER,
    amount REAL NOT NULL,
    reference_number TEXT,
    bank_name TEXT,
    account_holder TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT OR IGNORE INTO hs_codes (hs_code, description, duty_rate, requires_sabs) VALUES
('8517.12', 'Telephones for cellular networks', 0, 1),
('9503.00', 'Toys and games', 20, 1),
('3304.10', 'Lip make-up preparations', 15, 1),
('9403.60', 'Wooden furniture', 15, 1),
('6110.30', 'Sweaters, knitted', 40, 0),
('4202.22', 'Handbags', 25, 0);
`;

db.exec(initSQL, (err) => {
    if (err) {
        console.error('❌ Database init error:', err.message);
    } else {
        console.log('✅ Database initialized');
    }
});

app.locals.db = db;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ===== ROUTES =====
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const trackingRoutes = require('./routes/tracking');
const customsRoutes = require('./routes/customs');
const uploadRoutes = require('./routes/upload');
const wireRoutes = require('./routes/wire');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/customs', customsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wire', wireRoutes);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Database: ${dbPath}`);
});

process.on('SIGINT', () => { db.close(); process.exit(); });