const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function runAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

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

// Generate affiliate code
function generateAffiliateCode(email) {
    return crypto.createHash('md5').update(email + Date.now()).digest('hex').substring(0, 8);
}

// Get or create affiliate profile
router.get('/profile', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    
    try {
        const user = await runGet(db, 'SELECT email, company_name FROM users WHERE id = ?', [userId]);
        
        let affiliate = await runGet(db, 'SELECT * FROM affiliates WHERE user_id = ?', [userId]);
        
        if (!affiliate) {
            const code = generateAffiliateCode(user.email);
            await runExec(db,
                `INSERT INTO affiliates (user_id, affiliate_code, commission_rate, total_earnings, total_clicks, total_signups)
                 VALUES (?, ?, 10.00, 0, 0, 0)`,
                [userId, code]
            );
            affiliate = await runGet(db, 'SELECT * FROM affiliates WHERE user_id = ?', [userId]);
        }
        
        res.json({
            affiliate_code: affiliate.affiliate_code,
            commission_rate: affiliate.commission_rate,
            total_earnings: affiliate.total_earnings || 0,
            total_clicks: affiliate.total_clicks || 0,
            total_signups: affiliate.total_signups || 0,
            referral_link: `${process.env.APP_URL || 'http://localhost:8080'}/register.html?ref=${affiliate.affiliate_code}`
        });
        
    } catch (error) {
        console.error('Affiliate profile error:', error);
        res.status(500).json({ error: 'Failed to get affiliate profile' });
    }
});

// Track click on referral link
router.post('/track-click/:code', async (req, res) => {
    const db = req.app.locals.db;
    const code = req.params.code;
    
    try {
        await runExec(db,
            'UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE affiliate_code = ?',
            [code]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Track click error:', error);
        res.json({ success: false });
    }
});

// Track signup from referral
router.post('/track-signup', async (req, res) => {
    const db = req.app.locals.db;
    const { ref_code, new_user_id } = req.body;
    
    if (!ref_code) return res.json({ success: false });
    
    try {
        const affiliate = await runGet(db, 'SELECT user_id FROM affiliates WHERE affiliate_code = ?', [ref_code]);
        
        if (affiliate) {
            await runExec(db,
                `INSERT INTO affiliate_signups (affiliate_user_id, referred_user_id, commission_earned, status)
                 VALUES (?, ?, 0, 'pending')`,
                [affiliate.user_id, new_user_id]
            );
            
            await runExec(db,
                'UPDATE affiliates SET total_signups = total_signups + 1 WHERE affiliate_code = ?',
                [ref_code]
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Track signup error:', error);
        res.json({ success: false });
    }
});

// Get affiliate earnings
router.get('/earnings', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    
    try {
        const earnings = await runAll(db,
            `SELECT * FROM affiliate_signups 
             WHERE affiliate_user_id = ? AND status = 'approved'
             ORDER BY created_at DESC`,
            [userId]
        );
        
        const total = await runGet(db,
            'SELECT SUM(commission_earned) as total FROM affiliate_signups WHERE affiliate_user_id = ? AND status = "approved"',
            [userId]
        );
        
        res.json({
            earnings: earnings,
            total_earned: total?.total || 0
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ error: 'Failed to get earnings' });
    }
});

module.exports = router;