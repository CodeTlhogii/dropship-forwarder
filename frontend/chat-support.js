// ==================== CHAT SUPPORT SYSTEM ====================

class ChatSupport {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.createChatButton();
        this.createChatWindow();
        this.loadMessages();
        this.setupEventListeners();
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
            max-height: 500px;
            height: 450px;
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
                        <div style="font-size: 11px; opacity: 0.8;">We reply in minutes</div>
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
            ">
                <div style="text-align: center; color: #9ca3af; font-size: 12px; padding: 20px 0;">
                    👋 Hi there! How can we help you today?
                </div>
            </div>

            <!-- Quick Replies -->
            <div style="
                padding: 8px 16px;
                background: #f9fafb;
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                border-top: 1px solid #f3f4f6;
                flex-shrink: 0;
            ">
                <button onclick="chat.sendQuickReply('Tracking my order')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                ">🔍 Tracking</button>
                <button onclick="chat.sendQuickReply('I need help with shipping')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                ">📦 Shipping</button>
                <button onclick="chat.sendQuickReply('Payment issue')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                ">💰 Payment</button>
                <button onclick="chat.sendQuickReply('I want to cancel my order')" style="
                    background: #eff6ff;
                    color: #3b82f6;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 11px;
                    cursor: pointer;
                    white-space: nowrap;
                ">❌ Cancel</button>
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
        document.getElementById('chatBadge').style.display = 'none';
        this.unreadCount = 0;
        document.getElementById('chatInput').focus();
    }

    minimize() {
        const window = document.getElementById('chatWindow');
        window.style.display = 'none';
        this.isOpen = false;
    }

    close() {
        const window = document.getElementById('chatWindow');
        window.style.display = 'none';
        this.isOpen = false;
        // Optionally clear messages
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        // Simulate bot response
        this.simulateBotResponse(message);
    }

    sendQuickReply(message) {
        this.addMessage(message, 'user');
        this.simulateBotResponse(message);
    }

    addMessage(text, sender) {
        const container = document.getElementById('chatMessages');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.style.cssText = `
            display: flex;
            justify-content: ${sender === 'user' ? 'flex-end' : 'flex-start'};
            animation: chatMessageIn 0.3s ease;
        `;

        div.innerHTML = `
            <div style="
                max-width: 80%;
                padding: 10px 14px;
                border-radius: ${sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
                background: ${sender === 'user' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#e5e7eb'};
                color: ${sender === 'user' ? 'white' : '#1f2937'};
                font-size: 13px;
                line-height: 1.5;
            ">
                ${text}
                <div style="
                    font-size: 9px;
                    opacity: 0.6;
                    margin-top: 4px;
                    text-align: ${sender === 'user' ? 'right' : 'left'};
                ">${time}</div>
            </div>
        `;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;

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
            `;
            document.head.appendChild(style);
        }
    }

    simulateBotResponse(userMessage) {
        const responses = {
            'tracking': "🔍 Let me help you track your order! Please share your tracking number and I'll check it for you.",
            'shipping': "📦 Great question! We ship from China & USA to South Africa in 10-15 business days. Express options available!",
            'payment': "💰 We accept EFT/wire transfers and credit card via PayFast. Our team verifies payments within 24 hours.",
            'cancel': "❌ I understand. Please share your order number and I'll check if cancellation is still possible.",
            'default': "Thanks for reaching out! Our support team will get back to you shortly. For urgent issues, email us at support@dropshipforwarder.co.za"
        };

        let response = responses.default;
        const msg = userMessage.toLowerCase();
        if (msg.includes('track') || msg.includes('tracking')) response = responses.tracking;
        else if (msg.includes('ship') || msg.includes('delivery')) response = responses.shipping;
        else if (msg.includes('pay') || msg.includes('eft') || msg.includes('wire')) response = responses.payment;
        else if (msg.includes('cancel') || msg.includes('refund')) response = responses.cancel;

        setTimeout(() => {
            this.addMessage(response, 'bot');
        }, 800 + Math.random() * 600);
    }

    loadMessages() {
        // Load saved messages from localStorage
        try {
            const saved = JSON.parse(localStorage.getItem('chatMessages') || '[]');
            this.messages = saved;
        } catch (e) {}
    }

    setupEventListeners() {
        // Save messages when closing
        window.addEventListener('beforeunload', () => {
            const messages = document.querySelectorAll('#chatMessages .user-message, #chatMessages .bot-message');
            // ... save logic if needed
        });
    }
}

// Initialize chat when page loads
let chat;
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('chatButton')) return; // Only initialize once
    chat = new ChatSupport();
});