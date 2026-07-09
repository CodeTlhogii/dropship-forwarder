const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/csv');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Helper function
function runExec(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

// Bulk upload orders from CSV
router.post('/bulk-orders', authenticateToken, upload.single('csv'), async (req, res) => {
    const db = req.app.locals.db;
    const userId = req.userId;
    const results = [];
    const errors = [];

    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
            results.push(row);
        })
        .on('end', async () => {
            for (const row of results) {
                try {
                    await runExec(db,
                        `INSERT INTO orders 
                         (user_id, customer_name, customer_email, customer_phone, 
                          shipping_address, shipping_city, shipping_postal, product_name,
                          product_sku, product_value, product_weight_kg, product_hs_code, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, row.customer_name, row.customer_email, row.customer_phone,
                         row.shipping_address, row.shipping_city, row.shipping_postal,
                         row.product_name, row.product_sku, parseFloat(row.product_value), 
                         parseFloat(row.product_weight_kg), row.product_hs_code, 'pending']
                    );
                } catch (err) {
                    errors.push({ row, error: err.message });
                }
            }
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            
            res.json({
                success: results.length - errors.length,
                failed: errors.length,
                errors: errors.slice(0, 10) // Return first 10 errors
            });
        });
});

// Download CSV template
router.get('/csv-template', authenticateToken, (req, res) => {
    const template = `customer_name,customer_email,customer_phone,shipping_address,shipping_city,shipping_postal,product_name,product_sku,product_value,product_weight_kg,product_hs_code
John Doe,john@email.com,0712345678,15 Main St,Cape Town,8001,Wireless Headphones,HP-100,599,0.5,8517.12
Jane Smith,jane@email.com,0823456789,42 Beach Rd,Durban,4001,Bluetooth Speaker,BS-200,850,0.8,8518.22`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_template.csv');
    res.send(template);
});

module.exports = router;