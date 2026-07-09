const express = require('express');
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

// Get customer's orders (by email)
router.get('/orders/:email', async (req, res) => {
    const db = req.app.locals.db;
    const email = req.params.email;
    
    try {
        const orders = await runAll(db,
            `SELECT id, tracking_number, carrier, status, product_name, 
                    product_value, created_at, updated_at
             FROM orders 
             WHERE customer_email = ?
             ORDER BY created_at DESC`,
            [email]
        );
        
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Portal orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// Get single order details for customer
router.get('/order/:id/:email', async (req, res) => {
    const db = req.app.locals.db;
    const orderId = req.params.id;
    const email = req.params.email;
    
    try {
        const order = await runGet(db,
            `SELECT * FROM orders WHERE id = ? AND customer_email = ?`,
            [orderId, email]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const events = await runAll(db,
            'SELECT status, location, description, event_time FROM tracking_events WHERE order_id = ? ORDER BY event_time DESC',
            [orderId]
        );
        
        res.json({ order, events });
    } catch (error) {
        console.error('Portal order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

module.exports = router;