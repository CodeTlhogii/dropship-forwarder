const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    // Create affiliates table
    db.run(`CREATE TABLE IF NOT EXISTS affiliates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        affiliate_code TEXT UNIQUE NOT NULL,
        commission_rate REAL DEFAULT 10.00,
        total_earnings REAL DEFAULT 0,
        total_clicks INTEGER DEFAULT 0,
        total_signups INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.log('Error creating affiliates:', err.message);
        else console.log('✓ affiliates table created');
    });

    // Create affiliate_signups table
    db.run(`CREATE TABLE IF NOT EXISTS affiliate_signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        affiliate_user_id INTEGER NOT NULL,
        referred_user_id INTEGER NOT NULL,
        commission_earned REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        approved_at TEXT,
        FOREIGN KEY (affiliate_user_id) REFERENCES users(id),
        FOREIGN KEY (referred_user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.log('Error creating affiliate_signups:', err.message);
        else console.log('✓ affiliate_signups table created');
    });
});

db.close(() => {
    console.log('✅ Affiliate tables setup complete!');
});