const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper functions for database operations
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

// ==================== PUBLIC TRACKING (No Auth Required) ====================

router.get('/public/:trackingNumber', async (req, res) => {
    const db = req.app.locals.db;
    const { trackingNumber } = req.params;

    try {
        const order = await runGet(db,
            `SELECT id, tracking_number, carrier, status, product_name, 
                    shipping_address, customer_name, customer_email, customer_phone, created_at
             FROM orders
             WHERE tracking_number = ?`,
            [trackingNumber]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Tracking number not found' });
        }
        
        const events = await runAll(db,
            `SELECT status, location, description, event_time 
             FROM tracking_events 
             WHERE order_id = ? 
             ORDER BY event_time ASC`,
            [order.id]
        );
        
        res.json({ order, events });
    } catch (error) {
        console.error('Public tracking error:', error);
        res.status(500).json({ error: 'Failed to fetch tracking' });
    }
});

// ==================== AUTHENTICATED TRACKING ====================

router.get('/my-orders', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;

    try {
        const orders = await runAll(db,
            `SELECT id, tracking_number, carrier, status, product_name, customer_name, updated_at
             FROM orders
             WHERE user_id = ? AND tracking_number IS NOT NULL
             ORDER BY updated_at DESC`,
            [userId]
        );
        
        res.json(orders);
    } catch (error) {
        console.error('Get my tracking error:', error);
        res.status(500).json({ error: 'Failed to fetch tracking' });
    }
});

// ==================== UPDATE TRACKING (With Email Alerts) ====================

router.post('/update-tracking', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    const { order_id, tracking_number, carrier } = req.body;

    if (!order_id || !tracking_number) {
        return res.status(400).json({ error: 'Order ID and tracking number are required' });
    }

    try {
        const order = await runGet(db, 
            'SELECT id, customer_name, customer_email, customer_phone, product_name FROM orders WHERE id = ? AND user_id = ?', 
            [order_id, userId]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found or does not belong to you' });
        }

        await runExec(db,
            'UPDATE orders SET tracking_number = ?, carrier = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [tracking_number, carrier || 'DHL', 'in_transit', order_id]
        );

        // Add tracking events
        await runExec(db,
            `INSERT INTO tracking_events (order_id, status, location, description, event_time)
             VALUES (?, 'in_transit', 'System', ?, datetime('now'))`,
            [order_id, `Tracking number assigned: ${tracking_number} via ${carrier || 'DHL'}`]
        );
        
        await runExec(db,
            `INSERT INTO tracking_events (order_id, status, location, description, event_time)
             VALUES (?, 'in_transit', 'China Warehouse', ?, datetime('now'))`,
            [order_id, `Package shipped with ${carrier || 'DHL'}, tracking: ${tracking_number}`]
        );

        // Send email alert
        let emailSent = false;
        let emailPreviewUrl = null;
        
        if (order.customer_email) {
            try {
                const { sendTrackingEmail } = require('../services/alerts');
                const emailResult = await sendTrackingEmail(
                    order.customer_email, 
                    order.customer_name, 
                    tracking_number, 
                    'in_transit', 
                    order_id,
                    order.product_name
                );
                emailSent = emailResult.success;
                emailPreviewUrl = emailResult.previewUrl;
                console.log(`📧 Email sent to ${order.customer_email}`);
            } catch (emailErr) {
                console.log('Email service error:', emailErr.message);
            }
        }

        res.json({ 
            success: true, 
            tracking_number, 
            carrier: carrier || 'DHL',
            email_sent: emailSent,
            email_preview: emailPreviewUrl,
            message: `Tracking number ${tracking_number} added! ${emailSent ? 'Email notification sent.' : 'Email not sent (no email address).'}`
        });
        
    } catch (error) {
        console.error('Update tracking error:', error);
        res.status(500).json({ error: 'Failed to update tracking: ' + error.message });
    }
});

// ==================== BULK TRACKING UPDATE ====================

router.post('/bulk-update', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Updates array is required' });
    }

    const results = { success: [], failed: [] };

    for (const update of updates) {
        try {
            const order = await runGet(db, 
                'SELECT id, customer_email FROM orders WHERE id = ? AND user_id = ?', 
                [update.order_id, userId]
            );
            
            if (!order) {
                results.failed.push({ order_id: update.order_id, error: 'Order not found' });
                continue;
            }

            await runExec(db,
                'UPDATE orders SET tracking_number = ?, carrier = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [update.tracking_number, update.carrier || 'DHL', 'in_transit', update.order_id]
            );

            await runExec(db,
                `INSERT INTO tracking_events (order_id, status, location, description, event_time)
                 VALUES (?, 'in_transit', 'System', ?, datetime('now'))`,
                [update.order_id, `Tracking number assigned: ${update.tracking_number}`]
            );

            results.success.push(update.order_id);
        } catch (err) {
            results.failed.push({ order_id: update.order_id, error: err.message });
        }
    }

    res.json({ success: results.success.length, failed: results.failed.length, details: results });
});

// ==================== STATUS UPDATE ====================

router.patch('/:orderId/status', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    const { orderId } = req.params;
    const { status, location, description } = req.body;

    const validStatuses = ['pending', 'received_cn', 'consolidated', 'customs_clearance', 'in_transit', 'delivered', 'exception'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const order = await runGet(db, 
            'SELECT id, customer_email, customer_name, tracking_number FROM orders WHERE id = ? AND user_id = ?', 
            [orderId, userId]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await runExec(db,
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, orderId]
        );

        await runExec(db,
            `INSERT INTO tracking_events (order_id, status, location, description, event_time)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [orderId, status, location || null, description || null]
        );

        if (order.customer_email && order.tracking_number) {
            try {
                const { sendTrackingEmail } = require('../services/alerts');
                await sendTrackingEmail(
                    order.customer_email,
                    order.customer_name,
                    order.tracking_number,
                    status,
                    orderId,
                    'Your order'
                );
            } catch (err) {
                console.log('Email notification skipped:', err.message);
            }
        }

        res.json({ success: true, status, message: `Order status updated to ${status}` });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// ==================== WEBHOOK ====================

router.post('/webhook', async (req, res) => {
    const db = req.app.locals.db;
    const { tracking_number, status, location, description, carrier } = req.body;
    
    try {
        const order = await runGet(db,
            'SELECT id, customer_email, customer_name FROM orders WHERE tracking_number = ?',
            [tracking_number]
        );
        
        if (order) {
            await runExec(db,
                'UPDATE orders SET status = ?, carrier = COALESCE(?, carrier), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, carrier, order.id]
            );
            
            await runExec(db,
                `INSERT INTO tracking_events (order_id, status, location, description, event_time)
                 VALUES (?, ?, ?, ?, datetime('now'))`,
                [order.id, status, location || 'In transit', description || `Package status: ${status}`]
            );

            if (['delivered', 'exception'].includes(status) && order.customer_email) {
                try {
                    const { sendTrackingEmail } = require('../services/alerts');
                    await sendTrackingEmail(
                        order.customer_email,
                        order.customer_name,
                        tracking_number,
                        status,
                        order.id,
                        'Your package'
                    );
                } catch (err) {
                    console.log('Webhook email failed:', err.message);
                }
            }
        }
        
        res.json({ message: 'Webhook received successfully' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

// ==================== ORDER DETAILS ====================

router.get('/order/:orderId', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    const { orderId } = req.params;

    try {
        const order = await runGet(db,
            `SELECT id, tracking_number, carrier, status, product_name, customer_name, 
                    shipping_address, created_at, updated_at
             FROM orders 
             WHERE id = ? AND user_id = ?`,
            [orderId, userId]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        if (!order.tracking_number) {
            return res.json({ order, events: [], message: 'No tracking number assigned yet' });
        }
        
        const events = await runAll(db,
            `SELECT status, location, description, event_time 
             FROM tracking_events 
             WHERE order_id = ? 
             ORDER BY event_time DESC`,
            [orderId]
        );
        
        res.json({ order, events });
    } catch (error) {
        console.error('Get tracking info error:', error);
        res.status(500).json({ error: 'Failed to fetch tracking information' });
    }
});

// ==================== ETA CALCULATION ====================

router.get('/eta/:trackingNumber', async (req, res) => {
    const db = req.app.locals.db;
    const { trackingNumber } = req.params;

    try {
        const order = await runGet(db,
            'SELECT status, created_at FROM orders WHERE tracking_number = ?',
            [trackingNumber]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Tracking number not found' });
        }
        
        let eta = null;
        const createdDate = new Date(order.created_at);
        
        switch (order.status) {
            case 'pending': eta = new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000); break;
            case 'received_cn': eta = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case 'consolidated': eta = new Date(createdDate.getTime() + 10 * 24 * 60 * 60 * 1000); break;
            case 'customs_clearance': eta = new Date(createdDate.getTime() + 12 * 24 * 60 * 60 * 1000); break;
            case 'in_transit': eta = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000); break;
            case 'delivered': eta = new Date(order.updated_at); break;
            default: eta = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        }
        
        res.json({
            tracking_number: trackingNumber,
            status: order.status,
            estimated_delivery: eta.toISOString().split('T')[0],
            days_remaining: Math.max(0, Math.ceil((eta - new Date()) / (1000 * 60 * 60 * 24)))
        });
    } catch (error) {
        console.error('ETA calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate ETA' });
    }
});

module.exports = router;