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

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    
    try {
        // Total orders
        const totalOrders = await runGet(db, 
            'SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [userId]);
        
        // Orders by status
        const ordersByStatus = await runAll(db,
            `SELECT status, COUNT(*) as count FROM orders 
             WHERE user_id = ? GROUP BY status`, [userId]);
        
        // Revenue this month
        const revenue = await runGet(db,
            `SELECT SUM(product_value) as total FROM orders 
             WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
            [userId]);
        
        // Orders by month (last 6 months)
        const monthlyOrders = await runAll(db,
            `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count 
             FROM orders WHERE user_id = ? 
             GROUP BY strftime('%Y-%m', created_at) 
             ORDER BY month DESC LIMIT 6`,
            [userId]);
        
        // Top products
        const topProducts = await runAll(db,
            `SELECT product_name, COUNT(*) as count, SUM(product_value) as revenue 
             FROM orders WHERE user_id = ? 
             GROUP BY product_name 
             ORDER BY count DESC LIMIT 5`,
            [userId]);
        
        // Average delivery time (for completed orders with tracking)
        const avgDelivery = await runGet(db,
            `SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days 
             FROM orders WHERE user_id = ? AND status = 'delivered'`,
            [userId]);
        
        res.json({
            total_orders: totalOrders?.count || 0,
            orders_by_status: ordersByStatus,
            revenue_this_month: revenue?.total || 0,
            monthly_orders: monthlyOrders,
            top_products: topProducts,
            avg_delivery_days: avgDelivery?.avg_days ? Math.round(avgDelivery.avg_days) : 0
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Get shipping analytics
router.get('/shipping', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    
    try {
        const carriers = await runAll(db,
            `SELECT carrier, COUNT(*) as count FROM orders 
             WHERE user_id = ? AND carrier IS NOT NULL 
             GROUP BY carrier`, [userId]);
        
        const avgShippingCost = await runGet(db,
            `SELECT AVG(shipping_cost) as avg_cost FROM orders 
             WHERE user_id = ? AND shipping_cost IS NOT NULL`,
            [userId]);
        
        res.json({
            carriers: carriers,
            avg_shipping_cost: avgShippingCost?.avg_cost || 0
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to get shipping analytics' });
    }
});

module.exports = router;