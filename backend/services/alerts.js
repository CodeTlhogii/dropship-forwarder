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


// Add this function to alerts.js

async function sendPasswordResetEmail(email, resetUrl) {
    try {
        const transporter = await getTransporter();
        
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; background: #f9f9f9; }
                    .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
                    .warning { background: #fef3c7; padding: 15px; border-radius: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🔐 Reset Your Password</h2>
                    </div>
                    <div class="content">
                        <p>We received a request to reset your password.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" class="button">Reset Password →</a>
                        </div>
                        <div class="warning">
                            <p style="font-size: 12px; color: #92400e; margin: 0;">
                                ⚠️ This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                            </p>
                        </div>
                        <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
                        <p style="font-size: 12px; color: #666; word-break: break-all;">${resetUrl}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const info = await transporter.sendMail({
            from: '"Dropship Forwarder" <noreply@dropshipforwarder.co.za>',
            to: email,
            subject: '🔐 Reset Your Password - Dropship Forwarder',
            html: emailHtml
        });
        
        console.log(`📧 Password reset email sent to ${email}`);
        console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        
        return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
        
    } catch (error) {
        console.error('Password reset email error:', error);
        return { success: false, error: error.message };
    }
}

// Don't forget to export it!
module.exports = { 
    sendTrackingEmail, 
    sendTrackingSMS, 
    sendOrderConfirmation,
    sendPasswordResetEmail  // <-- Add this
};





