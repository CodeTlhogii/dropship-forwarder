



<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"></link>




// ==================== CHAT SUPPORT SYSTEM ====================

class ChatSupport {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.unreadCount = 0;
        this.isMinimized = false;
        this.init();
    }

    init() {
        this.createChatButton();
        this.createChatWindow();
        this.loadMessages();
        this.setupEventListeners();
        this.checkAuth();
    }

    checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            // Logged in - show chat with user info
            this.userEmail = this.getUserEmail();
            this.addSystemMessage(`👋 Welcome back! How can we help you today?`);
        } else {
            this.addSystemMessage(`👋 Hi there! Please login for personalized support.`);
        }
    }

    getUserEmail() {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.email || 'User';
            }
        } catch (e) {}
        return 'Guest';
    }

    createChatButton() {
        const button = document.createElement('div');
        button.id = 'chatButton';
        button.innerHTML = `
            <div style="
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                box-shadow: 0 4px 20px rgba(59,130,246,0.4);
                cursor: pointer;
                z-index: 9998;
                transition: all 0.3s ease;
                border: none;
            ">
                💬
                <span id="chatBadge" style="
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #ef4444;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                    padding: 2px 6px;
                    border-radius: 50%;
                    min-width: 18px;
                    text-align: center;
                    display: none;
                ">0</span>
            </div>
        `;
        document.body.appendChild(button);

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        button.addEventListener('click', () => this.toggleChat());
    }

    createChatWindow() {
        const window = document.createElement('div');
        window.id = 'chatWindow';
        window.style.cssText = `
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 380px;
            max-width: calc(100vw - 48px);
            max-height: 550px;
            height: 480px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border: 1px solid #e5e7eb;
        `;

        window.innerHTML = `
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                padding: 14px 20px;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">💬</span>
                    <div>
                        <div style="font-weight: 600; font-size: 15px;">Support Chat</div>
                        <div id="chatStatus" style="font-size: 11px; opacity: 0.8;">🟢 Online</div>
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button id="chatMinimize" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 30px;
                        height: 30px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        transition: background 0.2s;
                    ">−</button>
                    <button id="chatClose" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 30px;
                        height: 30px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.2s;
                    ">✕</button>
                </div>
            </div>

            <!-- Messages -->
            <div id="chatMessages" style="
                flex: 1;
                overflow-y: auto;
                padding: 16px 20px;
                background: #f9fafb;
                display: flex;
                flex-direction: column;
                gap: 8px;
            "></div>

            <!-- Quick Replies -->
            <div id="quickReplies" style="
                padding: 8px 16px;
                background: #f9fafb;
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                border-top: 1px solid #f3f4f6;
                flex-shrink: 0;
            ">
                <button onclick="chat.sendQuickReply('🔍 Track my order')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                ">🔍 Track</button>
                <button onclick="chat.sendQuickReply('📦 Shipping info')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                ">📦 Shipping</button>
                <button onclick="chat.sendQuickReply('💰 Payment')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                ">💰 Payment</button>
                <button onclick="chat.sendQuickReply('❌ Cancel order')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                ">❌ Cancel</button>
                <button onclick="chat.sendQuickReply('👤 Account help')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                ">👤 Account</button>
            </div>

            <!-- Input -->
            <div style="
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid #e5e7eb;
                background: white;
                flex-shrink: 0;
            ">
                <input id="chatInput" type="text" placeholder="Type your message..." style="
                    flex: 1;
                    border: 1px solid #d1d5db;
                    border-radius: 10px;
                    padding: 8px 14px;
                    font-size: 13px;
                    outline: none;
                    transition: border-color 0.2s;
                ">
                <button id="chatSend" style="
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 8px 16px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: opacity 0.2s;
                ">Send</button>
            </div>
        `;

        document.body.appendChild(window);

        // Event listeners
        document.getElementById('chatMinimize').addEventListener('click', () => this.minimize());
        document.getElementById('chatClose').addEventListener('click', () => this.close());
        document.getElementById('chatSend').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Focus input when chat opens
        document.getElementById('chatInput').addEventListener('focus', () => {
            this.unreadCount = 0;
            document.getElementById('chatBadge').style.display = 'none';
        });
    }

    toggleChat() {
        const window = document.getElementById('chatWindow');
        if (this.isOpen) {
            this.minimize();
        } else {
            this.open();
        }
    }

    open() {
        const window = document.getElementById('chatWindow');
        window.style.display = 'flex';
        window.style.animation = 'chatSlideUp 0.3s ease';
        this.isOpen = true;
        this.isMinimized = false;
        document.getElementById('chatBadge').style.display = 'none';
        this.unreadCount = 0;
        setTimeout(() => {
            document.getElementById('chatInput').focus();
        }, 300);
    }

    minimize() {
        const window = document.getElementById('chatWindow');
        window.style.display = 'none';
        this.isOpen = false;
        this.isMinimized = true;
    }

    close() {
        const window = document.getElementById('chatWindow');
        window.style.display = 'none';
        this.isOpen = false;
        this.isMinimized = false;
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';
        this.simulateBotResponse(message);
    }

    sendQuickReply(message) {
        // Remove the emoji prefix for the bot response
        const cleanMessage = message.replace(/^[^\s]+\s/, '').trim() || message;
        this.addMessage(message, 'user');
        this.simulateBotResponse(cleanMessage);
    }

    addSystemMessage(text) {
        const container = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.style.cssText = `
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            padding: 10px 0;
        `;
        div.textContent = text;
        container.appendChild(div);
    }

    addMessage(text, sender) {
        const container = document.getElementById('chatMessages');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Remove system messages if there are user messages
        if (sender === 'user') {
            const systemMessages = container.querySelectorAll('[style*="text-align: center; color: #9ca3af;"]');
            systemMessages.forEach(el => el.remove());
        }

        const div = document.createElement('div');
        div.style.cssText = `
            display: flex;
            justify-content: ${sender === 'user' ? 'flex-end' : 'flex-start'};
            animation: chatMessageIn 0.3s ease;
        `;

        const userName = sender === 'user' ? this.getUserEmail() : 'Support';
        const isUser = sender === 'user';

        div.innerHTML = `
            <div style="
                max-width: 80%;
                padding: 10px 14px;
                border-radius: ${isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
                background: ${isUser ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#e5e7eb'};
                color: ${isUser ? 'white' : '#1f2937'};
                font-size: 13px;
                line-height: 1.5;
                box-shadow: ${isUser ? '0 2px 8px rgba(59,130,246,0.2)' : 'none'};
            ">
                ${text}
                <div style="
                    font-size: 9px;
                    opacity: 0.6;
                    margin-top: 4px;
                    text-align: ${isUser ? 'right' : 'left'};
                ">${userName} • ${time}</div>
            </div>
        `;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;

        // Save to localStorage
        this.saveMessages();

        // Add styles if not present
        if (!document.getElementById('chatStyles')) {
            const style = document.createElement('style');
            style.id = 'chatStyles';
            style.textContent = `
                @keyframes chatSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes chatMessageIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #chatWindow {
                    transition: none;
                }
                #chatButton:hover {
                    transform: scale(1.1) !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    simulateBotResponse(userMessage) {
        const msg = userMessage.toLowerCase();
        let response = '';
        let delay = 800 + Math.random() * 600;

        // Smart responses based on keywords
        if (msg.includes('track') || msg.includes('tracking') || msg.includes('order status')) {
            response = "🔍 I can help you track your order! Please share your tracking number (starts with DSF) and I'll check the status for you.";
        } else if (msg.includes('ship') || msg.includes('delivery') || msg.includes('shipping') || msg.includes('arrive')) {
            response = "📦 We ship from China & USA to South Africa in 10-15 business days. Express shipping is available for 5-7 days. What's your order number?";
        } else if (msg.includes('pay') || msg.includes('payment') || msg.includes('eft') || msg.includes('wire') || msg.includes('credit card')) {
            response = "💰 We accept EFT/wire transfers and credit card via PayFast. Our team verifies payments within 24 hours. Would you like me to email you the banking details?";
        } else if (msg.includes('cancel') || msg.includes('refund') || msg.includes('return')) {
            response = "❌ I understand you want to cancel/return. Please share your order number and I'll check if it's still eligible for cancellation. Our policy allows cancellations within 24 hours.";
        } else if (msg.includes('account') || msg.includes('login') || msg.includes('password') || msg.includes('reset')) {
            response = "👤 For account help, you can reset your password from the login page. If you're locked out, I can send a password reset link to your email. Just confirm your email address.";
        } else if (msg.includes('pricing') || msg.includes('cost') || msg.includes('price') || msg.includes('plan')) {
            response = "💰 Our pricing starts at R499/month for 50 orders. The Professional plan at R999/month is our most popular with 200 orders and priority support. Check our pricing page for details!";
        } else if (msg.includes('warehouse') || msg.includes('address') || msg.includes('china') || msg.includes('usa')) {
            response = "🏭 We have warehouses in both China (Shanghai) and the USA (Los Angeles). You'll find the full addresses in your dashboard. Need me to send them again?";
        } else if (msg.includes('affiliate') || msg.includes('refer') || msg.includes('commission')) {
            response = "🤝 Our affiliate program gives you 10% commission on every referral. Share your unique link and earn passive income. Want me to help you set it up?";
        } else if (msg.includes('duty') || msg.includes('customs') || msg.includes('ddp') || msg.includes('vat')) {
            response = "🛃 We offer DDP (Delivered Duty Paid) which means all customs duties and taxes are prepaid. Your customer pays nothing extra on delivery. It's a game-changer for conversion!";
        } else if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey') || msg.includes('good morning')) {
            response = "👋 Hey there! How can I help you today? I can assist with tracking, shipping, payments, or anything else you need.";
        } else {
            response = "Thanks for reaching out! Our support team will get back to you shortly. If this is urgent, please email us at support@dropshipforwarder.co.za or call +27 12 345 6789.";
        }

        // Add response with typing delay
        setTimeout(() => {
            this.addMessage(response, 'bot');
        }, delay);
    }

    loadMessages() {
        try {
            const saved = localStorage.getItem('chatMessages');
            if (saved) {
                const messages = JSON.parse(saved);
                messages.forEach(msg => {
                    this.addMessage(msg.text, msg.sender);
                });
            }
        } catch (e) {}
    }

    saveMessages() {
        try {
            const container = document.getElementById('chatMessages');
            const messages = [];
            container.querySelectorAll('[style*="display: flex;"]').forEach(el => {
                const textEl = el.querySelector('[style*="max-width: 80%"]');
                if (textEl) {
                    const text = textEl.childNodes[0].textContent.trim();
                    const isUser = textEl.style.background.includes('linear-gradient');
                    messages.push({ text, sender: isUser ? 'user' : 'bot' });
                }
            });
            localStorage.setItem('chatMessages', JSON.stringify(messages));
        } catch (e) {}
    }

    setupEventListeners() {
        // Save messages when closing
        window.addEventListener('beforeunload', () => {
            this.saveMessages();
        });

        // Show badge when new message arrives while minimized
        const observer = new MutationObserver(() => {
            if (!this.isOpen && !this.isMinimized) {
                const badge = document.getElementById('chatBadge');
                this.unreadCount++;
                badge.textContent = this.unreadCount;
                badge.style.display = 'block';
            }
        });
        observer.observe(document.getElementById('chatMessages'), { childList: true });
    }
}

// Initialize chat when page loads
let chat;
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('chatButton')) return;
    chat = new ChatSupport();
});

// Helper function to clear chat
function clearChat() {
    if (confirm('Clear all chat messages?')) {
        localStorage.removeItem('chatMessages');
        document.getElementById('chatMessages').innerHTML = '';
        chat.addSystemMessage('👋 Chat cleared. How can we help you today?');
        toast.info('Chat cleared');
    }
}