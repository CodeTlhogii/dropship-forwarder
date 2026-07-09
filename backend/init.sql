-- Users table
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
    trial_used INTEGER DEFAULT 0,
    bank_account TEXT,
    bank_name TEXT
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store_order_id TEXT UNIQUE,
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
    customs_declared_value REAL,
    duties_paid REAL DEFAULT 0,
    ddp_enabled INTEGER DEFAULT 0,
    shipping_cost REAL,
    total_charged REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tracking events table
CREATE TABLE IF NOT EXISTS tracking_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    event_time TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- HS Codes table
CREATE TABLE IF NOT EXISTS hs_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hs_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    duty_rate REAL DEFAULT 0,
    vat_rate REAL DEFAULT 15,
    requires_sabs INTEGER DEFAULT 0
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    subscription_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    payfast_token TEXT,
    plan_type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    next_billing_at TEXT,
    cancelled_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Proof of payments table
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
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Insert sample HS codes
INSERT OR IGNORE INTO hs_codes (hs_code, description, duty_rate, requires_sabs) VALUES
('8517.12', 'Telephones for cellular networks', 0, 1),
('9503.00', 'Toys and games', 20, 1),
('3304.10', 'Lip make-up preparations', 15, 1),
('9403.60', 'Wooden furniture', 15, 1),
('8528.72', 'Televisions', 15, 1),
('6110.30', 'Sweaters, knitted, man-made fibers', 40, 0),
('4202.22', 'Handbags, with outer surface of plastic', 25, 0);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_tracking_order_id ON tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_user_id ON proof_of_payments(user_id);