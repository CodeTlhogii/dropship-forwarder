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

// Lookup HS code
router.get('/hs-code/:search', async (req, res) => {
    const db = req.app.locals.db;
    const { search } = req.params;

    try {
        const results = await runAll(db,
            `SELECT hs_code, description, duty_rate, vat_rate, requires_sabs
             FROM hs_codes
             WHERE hs_code LIKE ? OR description LIKE ?
             LIMIT 20`,
            [`%${search}%`, `%${search}%`]
        );
        
        res.json(results);
    } catch (error) {
        console.error('HS code lookup error:', error);
        res.status(500).json({ error: 'Failed to lookup HS code' });
    }
});

// Calculate duties
router.post('/calculate', authenticateToken, async (req, res) => {
    const db = req.app.locals.db;
    const { product_value, product_hs_code, quantity = 1 } = req.body;

    try {
        let duty_rate = 0;
        let vat_rate = 15;
        let requires_sabs = 0;
        
        if (product_hs_code) {
            const hs = await runGet(db,
                'SELECT duty_rate, vat_rate, requires_sabs FROM hs_codes WHERE hs_code = ?',
                [product_hs_code]
            );
            if (hs) {
                duty_rate = hs.duty_rate || 0;
                vat_rate = hs.vat_rate || 15;
                requires_sabs = hs.requires_sabs || 0;
            }
        }
        
        const totalValue = product_value * quantity;
        const dutyAmount = (totalValue * duty_rate) / 100;
        const vatAmount = (totalValue * vat_rate) / 100;
        const totalDuties = dutyAmount + vatAmount;
        const shippingEstimate = 150 + (product_value > 1000 ? 50 : 0);
        
        res.json({
            product_value: totalValue,
            duty_rate,
            duty_amount: dutyAmount,
            vat_rate,
            vat_amount: vatAmount,
            total_duties: totalDuties,
            shipping_estimate: shippingEstimate,
            total_estimate: totalValue + totalDuties + shippingEstimate,
            requires_sabs: requires_sabs === 1,
            sabs_deadline: '2026-09-20'
        });
    } catch (error) {
        console.error('Calculate duties error:', error);
        res.status(500).json({ error: 'Failed to calculate duties' });
    }
});

// Generate customs declaration
router.post('/generate-declaration', authenticateToken, async (req, res) => {
    const { order_id } = req.body;
    const db = req.app.locals.db;
    const userId = req.userId;

    try {
        const order = await runGet(db,
            `SELECT o.*, u.company_name, u.email 
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ? AND o.user_id = ?`,
            [order_id, userId]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const declarationHTML = `
            <!DOCTYPE html>
            <html>
            <head><title>Customs Declaration</title></head>
            <body>
                <h2>South African Customs Declaration</h2>
                <p>Order ID: ${order.id}</p>
                <p>Product: ${order.product_name}</p>
                <p>Value: R ${order.product_value}</p>
                <p>Customer: ${order.customer_name}</p>
                <p>Address: ${order.shipping_address}</p>
            </body>
            </html>
        `;
        
        res.json({
            declaration_html: declarationHTML,
            order_id: order.id
        });
    } catch (error) {
        console.error('Generate declaration error:', error);
        res.status(500).json({ error: 'Failed to generate declaration' });
    }
});

// SABS compliance checker
router.get('/sabs-check/:hs_code', async (req, res) => {
    const db = req.app.locals.db;
    const { hs_code } = req.params;

    try {
        const results = await runAll(db,
            'SELECT requires_sabs FROM hs_codes WHERE hs_code LIKE ?',
            [`${hs_code}%`]
        );
        
        const requiresSABS = results.some(row => row.requires_sabs === 1);
        
        res.json({
            hs_code,
            requires_sabs: requiresSABS,
            effective_date: '2026-09-20',
            message: requiresSABS ? '⚠️ SABS Certificate required from Sep 2026' : '✓ No SABS required'
        });
    } catch (error) {
        console.error('SABS check error:', error);
        res.status(500).json({ error: 'Failed to check SABS' });
    }
});


// Generate PDF customs form
router.post('/generate-pdf', authenticateToken, async (req, res) => {
    const { order_id } = req.body;
    const db = req.app.locals.db;
    const userId = req.userId;

    try {
        const order = await runGet(db,
            `SELECT o.*, u.company_name, u.email 
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.id = ? AND o.user_id = ?`,
            [order_id, userId]
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const pdfHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Customs Declaration - Order ${order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 { color: #1e3a8a; margin: 0; }
                    .section { margin-bottom: 25px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                    .section-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; background: #f0f0f0; padding: 8px; border-radius: 4px; }
                    .row { margin: 8px 0; }
                    .label { font-weight: bold; display: inline-block; width: 180px; }
                    .value { display: inline-block; }
                    .barcode { text-align: center; margin: 20px 0; font-family: monospace; font-size: 24px; letter-spacing: 2px; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                    .signature-line { margin-top: 30px; border-top: 1px solid #333; width: 300px; margin-left: 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>SOUTH AFRICAN CUSTOMS DECLARATION</h1>
                    <p>SARS Importer Code: ${process.env.SARS_IMPORTER_CODE || 'PENDING_REGISTRATION'}</p>
                    <p>Date: ${new Date().toLocaleDateString('en-ZA')}</p>
                </div>
                
                <div class="barcode">
                    ${order.tracking_number || 'TRACKING_PENDING'}
                </div>
                
                <div class="section">
                    <div class="section-title">📦 SHIPPER INFORMATION</div>
                    <div class="row"><span class="label">Company Name:</span><span class="value">${order.company_name || 'Dropship Forwarder (Pty) Ltd'}</span></div>
                    <div class="row"><span class="label">Contact Email:</span><span class="value">${order.email}</span></div>
                    <div class="row"><span class="label">Physical Address:</span><span class="value">Unit 5, Airport Industria, Cape Town, 7490</span></div>
                </div>
                
                <div class="section">
                    <div class="section-title">👤 CONSIGNEE INFORMATION</div>
                    <div class="row"><span class="label">Full Name:</span><span class="value">${order.customer_name}</span></div>
                    <div class="row"><span class="label">Email:</span><span class="value">${order.customer_email || 'Not provided'}</span></div>
                    <div class="row"><span class="label">Phone:</span><span class="value">${order.customer_phone || 'Not provided'}</span></div>
                    <div class="row"><span class="label">Delivery Address:</span><span class="value">${order.shipping_address}, ${order.shipping_city || ''} ${order.shipping_postal || ''}</span></div>
                </div>
                
                <div class="section">
                    <div class="section-title">📋 GOODS DESCRIPTION</div>
                    <div class="row"><span class="label">Product Name:</span><span class="value">${order.product_name}</span></div>
                    <div class="row"><span class="label">SKU / Model:</span><span class="value">${order.product_sku || 'N/A'}</span></div>
                    <div class="row"><span class="label">HS Tariff Code:</span><span class="value">${order.product_hs_code || 'Not classified'}</span></div>
                    <div class="row"><span class="label">Quantity:</span><span class="value">1</span></div>
                    <div class="row"><span class="label">Gross Weight:</span><span class="value">${order.product_weight_kg} kg</span></div>
                    <div class="row"><span class="label">Country of Origin:</span><span class="value">China (CN)</span></div>
                </div>
                
                <div class="section">
                    <div class="section-title">💰 VALUE & DUTIES</div>
                    <div class="row"><span class="label">Commercial Value (ZAR):</span><span class="value">R ${order.product_value}</span></div>
                    <div class="row"><span class="label">Freight Charges (ZAR):</span><span class="value">R ${order.shipping_cost || 150}</span></div>
                    <div class="row"><span class="label">Insurance (ZAR):</span><span class="value">R 0</span></div>
                    <div class="row"><span class="label">Total CIF Value:</span><span class="value">R ${(order.product_value + (order.shipping_cost || 150))}</span></div>
                    <div class="row"><span class="label">Duties Prepaid (DDP):</span><span class="value">${order.ddp_enabled ? '✓ YES' : '✗ NO'}</span></div>
                    <div class="row"><span class="label">Total Duties Paid:</span><span class="value">R ${order.duties_paid || 0}</span></div>
                </div>
                
                <div class="section">
                    <div class="section-title">✅ DECLARATION</div>
                    <p>I hereby declare that the information provided in this customs declaration is true, accurate, and complete to the best of my knowledge. The goods being imported comply with all South African import regulations and standards.</p>
                    <div class="signature-line"></div>
                    <div class="row"><span class="label">Authorized Signature:</span><span class="value">___________________________</span></div>
                    <div class="row"><span class="label">Date Signed:</span><span class="value">${new Date().toLocaleDateString('en-ZA')}</span></div>
                </div>
                
                <div class="footer">
                    <p>Dropship Forwarder (Pty) Ltd | VAT Number: PENDING | SARS Registered Importer</p>
                    <p>This document was generated electronically and is legally binding.</p>
                </div>
            </body>
            </html>
        `;
        
        res.json({
            success: true,
            pdf_html: pdfHTML,
            order_id: order.id,
            tracking_number: order.tracking_number
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});


module.exports = router;