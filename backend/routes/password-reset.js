const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const router = express.Router();

function runGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
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

// Import email service
const { sendPasswordResetEmail } = require('../services/alerts');

// ==================== REQUEST PASSWORD RESET ====================

router.post('/request', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const db = req.app.locals.db;

    try {
        // Check if user exists
        const user = await runGet(db, 'SELECT id, email FROM users WHERE email = ?', [email]);
        
        if (!user) {
            // Don't reveal if email exists or not (security)
            return res.json({ 
                success: true, 
                message: 'If an account exists with this email, you will receive a password reset link.' 
            });
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1); // 1 hour expiry

        // Save token to database
        await runExec(db,
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [token, expires.toISOString(), user.id]
        );

        // Send email
        const resetUrl = `${process.env.APP_URL || 'http://localhost:8080'}/reset-password.html?token=${token}`;
        
        await sendPasswordResetEmail(email, resetUrl);

        console.log(`📧 Password reset email sent to ${email}`);
        
        res.json({ 
            success: true, 
            message: 'If an account exists with this email, you will receive a password reset link.' 
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// ==================== VERIFY RESET TOKEN ====================

router.get('/verify/:token', async (req, res) => {
    const { token } = req.params;
    const db = req.app.locals.db;

    try {
        const user = await runGet(db,
            'SELECT id, reset_token_expires FROM users WHERE reset_token = ?',
            [token]
        );

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        }

        const expires = new Date(user.reset_token_expires);
        if (expires < new Date()) {
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }

        res.json({ valid: true, message: 'Token is valid' });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

// ==================== RESET PASSWORD ====================

router.post('/reset', [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const db = req.app.locals.db;

    try {
        // Verify token
        const user = await runGet(db,
            'SELECT id, reset_token_expires FROM users WHERE reset_token = ?',
            [token]
        );

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        }

        const expires = new Date(user.reset_token_expires);
        if (expires < new Date()) {
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset token
        await runExec(db,
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        console.log(`✅ Password reset successfully for user ${user.id}`);

        res.json({ 
            success: true, 
            message: 'Password reset successfully! You can now login with your new password.' 
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;