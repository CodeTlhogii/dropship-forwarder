const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function runGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, function(err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function runExec(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

function runAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, function(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Create uploads folder
const uploadDir = path.join(__dirname, '../uploads/proofs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pop-' + unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        cb(null, types.includes(file.mimetype));
    }
});

// Get banking details
router.get('/bank-details', authenticateToken, function(req, res) {
    res.json({
        bank_name: 'First National Bank (FNB)',
        account_name: 'Dropship Forwarder (Pty) Ltd',
        account_number: '62830987654',
        branch_code: '250655',
        reference_format: 'YOUR_FULL_NAME'
    });
});

// Submit proof of payment
router.post('/submit-proof', authenticateToken, upload.single('proof_file'), async function(req, res) {
    const db = req.app.locals.db;
    const userId = req.userId;
    const amount = req.body.amount;
    const reference = req.body.reference_number;
    const bankName = req.body.bank_name;
    const accountHolder = req.body.account_holder;
    
    if (!amount || amount < 5) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Minimum deposit is R5' });
    }
    
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload proof of payment' });
    }
    
    try {
        const transaction = await runExec(db,
            'INSERT INTO transactions (user_id, amount, type, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
            [userId, parseFloat(amount), 'deposit', 'wire_transfer', 'pending']
        );
        
        await runExec(db,
            'INSERT INTO proof_of_payments (user_id, transaction_id, amount, reference_number, bank_name, account_holder, file_path, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
            [userId, transaction.id, parseFloat(amount), reference || null, bankName || null, accountHolder || null, req.file.path, 'pending']
        );
        
        res.json({ success: true, message: 'Proof submitted! We will verify within 24 hours.' });
    } catch (err) {
        console.error('Submit error:', err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Failed to submit' });
    }
});

// Get deposit history
router.get('/history', authenticateToken, async function(req, res) {
    const db = req.app.locals.db;
    const userId = req.userId;
    
    try {
        const history = await runAll(db,
            `SELECT t.id, t.amount, t.status, t.created_at,
                    p.reference_number, p.bank_name, p.approved_at
             FROM transactions t
             LEFT JOIN proof_of_payments p ON t.id = p.transaction_id
             WHERE t.user_id = ? AND t.type = 'deposit'
             ORDER BY t.created_at DESC
             LIMIT 20`,
            [userId]
        );
        res.json(history);
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Get wallet balance
router.get('/wallet', authenticateToken, async function(req, res) {
    const db = req.app.locals.db;
    const userId = req.userId;
    
    try {
        const user = await runGet(db, 'SELECT wallet_balance FROM users WHERE id = ?', [userId]);
        res.json({ balance: user?.wallet_balance || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;