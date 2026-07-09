// ==================== TOAST NOTIFICATIONS ====================

class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 420px;
                width: 100%;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info', title = '', duration = 5000) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };

        const titles = {
            success: 'Success!',
            error: 'Error!',
            info: 'Notice',
            warning: 'Warning'
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.12);
            display: flex;
            align-items: flex-start;
            gap: 14px;
            pointer-events: all;
            animation: toastSlideIn 0.4s ease;
            border-left: 4px solid ${colors[type]};
            min-width: 280px;
            max-width: 420px;
            position: relative;
        `;

        toast.innerHTML = `
            <div style="font-size: 22px; flex-shrink: 0; line-height: 1;">${icons[type]}</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 14px; color: #111827; margin-bottom: 3px;">${title || titles[type]}</div>
                <div style="font-size: 13px; color: #6b7280; line-height: 1.5; word-wrap: break-word;">${message}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: #9ca3af;
                font-size: 18px;
                cursor: pointer;
                padding: 0 4px;
                flex-shrink: 0;
                line-height: 1;
                transition: color 0.2s;
            ">✕</button>
        `;

        // Add hover effect for close button
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#374151');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#9ca3af');

        this.container.appendChild(toast);

        // Auto dismiss
        const timeout = setTimeout(() => {
            this.remove(toast);
        }, duration);

        // Pause on hover
        toast.addEventListener('mouseenter', () => clearTimeout(timeout));
        toast.addEventListener('mouseleave', () => {
            clearTimeout(timeout);
            setTimeout(() => this.remove(toast), 2000);
        });

        // Click to dismiss
        toast.addEventListener('click', (e) => {
            if (e.target === closeBtn) return;
            this.remove(toast);
        });

        // Add styles if not present
        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes toastSlideOut {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(40px); }
                }
            `;
            document.head.appendChild(style);
        }

        return toast;
    }

    remove(toast) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 300);
    }

    success(message, title = '') {
        return this.show(message, 'success', title);
    }

    error(message, title = '') {
        return this.show(message, 'error', title);
    }

    info(message, title = '') {
        return this.show(message, 'info', title);
    }

    warning(message, title = '') {
        return this.show(message, 'warning', title);
    }
}

// Global toast instance
const toast = new Toast();

// Quick usage examples:
// toast.success('Order created successfully!');
// toast.error('Failed to create order');
// toast.info('Welcome back!');
// toast.warning('Your trial ends in 3 days');