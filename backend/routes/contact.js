const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../services/alerts');

router.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email and message are required' });
    }

    try {
        await sendContactEmail(name, email, subject, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;