const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
    if (!transporter) {
        // USING GMAIL - REAL EMAIL TO YOUR PHONE!
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'YOUR_EMAIL@gmail.com',    // <-- PUT YOUR EMAIL HERE
                pass: 'YOUR_APP_PASSWORD'        // <-- PUT YOUR APP PASSWORD HERE
            }
        });
        console.log('📧 Gmail ready! Real emails coming!');
    }
    return transporter;
}

async function sendTrackingEmail(customerEmail, customerName, trackingNumber, status, orderId, productName) {
    try {
        const transporter = await getTransporter();
        const trackingUrl = `http://localhost:8080/tracking.html?tracking=${trackingNumber}`;
        
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; background: #f9f9f9; }
                    .tracking-box { background: white; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb; }
                    .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📦 Your Order Has Shipped!</h2>
                    </div>
                    <div class="content">
                        <h3>Hello ${customerName},</h3>
                        <p>Good news! Your order <strong>${productName}</strong> has been shipped.</p>
                        <div class="tracking-box">
                            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                            <p><strong>Carrier:</strong> DHL / FedEx</p>
                        </div>
                        <div style="text-align: center;">
                            <a href="${trackingUrl}" class="button">Track Your Package →</a>
                        </div>
                        <p style="font-size: 12px; color: #666;">Thank you for choosing Dropship Forwarder!</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const info = await transporter.sendMail({
            from: '"Dropship Forwarder" <YOUR_EMAIL@gmail.com>',  // Use your email
            to: customerEmail,
            subject: `📦 Your order ${trackingNumber} has shipped!`,
            html: emailHtml
        });
        
        console.log(`📧 EMAIL SENT TO ${customerEmail}!`);
        console.log(`📧 Message ID: ${info.messageId}`);
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendTrackingSMS(customerPhone, trackingNumber, status, orderId) {
    console.log(`📱 SMS to ${customerPhone}: Track ${trackingNumber}`);
    return { success: false, message: 'SMS not configured yet' };
}

module.exports = { sendTrackingEmail, sendTrackingSMS };