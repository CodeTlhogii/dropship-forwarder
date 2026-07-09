CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    wallet_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
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

INSERT OR IGNORE INTO hs_codes (hs_code, description, duty_rate, requires_sabs) VALUES
('8517.12', 'Telephones for cellular networks', 0, 1),
('9503.00', 'Toys and games', 20, 1),
('3304.10', 'Lip make-up preparations', 15, 1),
('9403.60', 'Wooden furniture', 15, 1),
('6110.30', 'Sweaters, knitted', 40, 0),
('4202.22', 'Handbags, plastic', 25, 0);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);