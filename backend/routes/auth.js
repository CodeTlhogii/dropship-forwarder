const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
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

// ==================== REGISTER (WITH FREE TRIAL + REFERRAL) ====================

router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, company_name, phone } = req.body;
    const ref = req.query.ref; // Get referral code from URL
    const db = req.app.locals.db;

    try {
        const existing = await runQuery(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Calculate trial end date (14 days from now)
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);
        const trialEndsISO = trialEnds.toISOString();
        
        // Insert user with trial columns
        const result = await runExec(db, 
            `INSERT INTO users (email, password_hash, company_name, phone, trial_started, trial_ends, trial_used, wallet_balance) 
             VALUES (?, ?, ?, ?, datetime('now'), ?, 0, 0)`,
            [email, hashedPassword, company_name || null, phone || null, trialEndsISO]
        );

        // Track referral if code exists
        if (ref) {
            try {
                await axios.post(`${process.env.API_URL || 'http://localhost:3000'}/api/affiliate/track-signup`, {
                    ref_code: ref,
                    new_user_id: result.id
                });
                console.log(`✅ Referral tracked: ${ref} -> new user ${result.id}`);
            } catch (err) {
                console.log('Referral tracking error:', err.message);
            }
        }

        const token = jwt.sign(
            { userId: result.id, email: email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful - 14 day free trial activated!',
            token,
            user: { 
                id: result.id, 
                email, 
                company_name: company_name || null,
                trial_ends: trialEndsISO
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ==================== LOGIN ====================

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = req.app.locals.db;

    try {
        const user = await runQuery(db, 'SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if trial is still active
        const now = new Date();
        const trialEnds = user.trial_ends ? new Date(user.trial_ends) : null;
        const isTrialActive = user.trial_used === 0 && trialEnds && trialEnds > now;
        
        // Check if trial has expired but not marked
        if (user.trial_used === 0 && trialEnds && trialEnds <= now) {
            await runExec(db, 'UPDATE users SET trial_used = 1 WHERE id = ?', [user.id]);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                company_name: user.company_name,
                wallet_balance: user.wallet_balance || 0,
                trial_active: isTrialActive,
                trial_days_left: isTrialActive ? Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)) : 0
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ==================== GET CURRENT USER ====================

router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = req.app.locals.db;
        const user = await runQuery(db,
            `SELECT id, email, company_name, phone, wallet_balance, created_at, 
                    trial_started, trial_ends, trial_used
             FROM users WHERE id = ?`,
            [decoded.userId]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Calculate trial status
        const now = new Date();
        const trialEnds = user.trial_ends ? new Date(user.trial_ends) : null;
        const isTrialActive = user.trial_used === 0 && trialEnds && trialEnds > now;
        const trialDaysLeft = isTrialActive ? Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)) : 0;
        
        res.json({
            id: user.id,
            email: user.email,
            company_name: user.company_name,
            phone: user.phone,
            wallet_balance: user.wallet_balance || 0,
            created_at: user.created_at,
            trial_active: isTrialActive,
            trial_used: user.trial_used === 1,
            trial_days_left: trialDaysLeft,
            trial_ends: user.trial_ends
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ==================== CHECK TRIAL STATUS ====================

router.get('/trial-status', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = req.app.locals.db;
        const user = await runQuery(db,
            'SELECT trial_started, trial_ends, trial_used FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const now = new Date();
        const trialEnds = user.trial_ends ? new Date(user.trial_ends) : null;
        const isTrialing = user.trial_used === 0 && trialEnds && trialEnds > now;
        const daysLeft = isTrialing ? Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)) : 0;
        
        res.json({
            is_trial: isTrialing,
            trial_used: user.trial_used === 1,
            trial_days_left: daysLeft,
            trial_ends: trialEnds,
            trial_started: user.trial_started
        });
    } catch (error) {
        console.error('Trial status error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;