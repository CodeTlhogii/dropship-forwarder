const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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

router.use(authenticateToken);

router.get('/', async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;

    try {
        const orders = await runAll(db,
            `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

router.get('/:id', async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    const orderId = req.params.id;

    try {
        const order = await runGet(db,
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [orderId, userId]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const events = await runAll(db,
            'SELECT * FROM tracking_events WHERE order_id = ? ORDER BY event_time DESC',
            [orderId]
        );
        
        res.json({ ...order, tracking_events: events });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

router.post('/', [
    body('customer_name').notEmpty(),
    body('shipping_address').notEmpty(),
    body('product_name').notEmpty(),
    body('product_value').isNumeric(),
    body('product_weight_kg').isNumeric()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const db = req.app.locals.db;
    const userId = req.userId;
    const {
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        shipping_city,
        shipping_postal,
        shipping_country,
        product_name,
        product_sku,
        product_value,
        product_weight_kg,
        product_hs_code,
        ddp_enabled
    } = req.body;

    try {
        const result = await runExec(db,
            `INSERT INTO orders 
             (user_id, customer_name, customer_email, customer_phone, 
              shipping_address, shipping_city, shipping_postal, shipping_country,
              product_name, product_sku, product_value, product_weight_kg, 
              product_hs_code, ddp_enabled, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, customer_name, customer_email || null, customer_phone || null,
             shipping_address, shipping_city || null, shipping_postal || null, shipping_country || 'South Africa',
             product_name, product_sku || null, product_value, product_weight_kg,
             product_hs_code || null, ddp_enabled ? 1 : 0, 'pending']
        );
        
        await runExec(db,
            `INSERT INTO tracking_events (order_id, status, location, description)
             VALUES (?, 'pending', 'System', 'Order received and awaiting processing')`,
            [result.id]
        );
        
        const newOrder = await runGet(db, 'SELECT * FROM orders WHERE id = ?', [result.id]);
        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

router.patch('/:id/status', async (req, res) => {
    const db = req.app.locals.db;
    const { status, location, description } = req.body;
    const orderId = req.params.id;

    try {
        await runExec(db,
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, orderId]
        );
        
        await runExec(db,
            `INSERT INTO tracking_events (order_id, status, location, description)
             VALUES (?, ?, ?, ?)`,
            [orderId, status, location || null, description || null]
        );
        
        res.json({ message: 'Order status updated', status });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;