const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(function() {
    // Add bank_account column
    db.run("ALTER TABLE users ADD COLUMN bank_account TEXT", function(err) {
        if (err && err.message.includes('duplicate')) {
            console.log('✓ bank_account already exists');
        } else if (err) {
            console.log('Error:', err.message);
        } else {
            console.log('✓ bank_account column added');
        }
    });

    // Add bank_name column
    db.run("ALTER TABLE users ADD COLUMN bank_name TEXT", function(err) {
        if (err && err.message.includes('duplicate')) {
            console.log('✓ bank_name already exists');
        } else if (err) {
            console.log('Error:', err.message);
        } else {
            console.log('✓ bank_name column added');
        }
    });

    // Create proof_of_payments table
    db.run(`CREATE TABLE IF NOT EXISTS proof_of_payments (
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
        approved_at TEXT
    )`, function(err) {
        if (err) {
            console.log('Error creating table:', err.message);
        } else {
            console.log('✓ proof_of_payments table created');
        }
    });
});

db.close(function() {
    console.log('✅ Database setup complete!');
});