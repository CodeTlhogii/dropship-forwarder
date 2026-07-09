// ==================== AUTH-AWARE NAVIGATION ====================

function updateNavigation() {
    const token = localStorage.getItem('token');
    const isLoggedIn = token && token !== 'null' && token !== 'undefined';
    
    // Find all navigation containers
    document.querySelectorAll('nav, .nav-container, [data-auth-nav]').forEach(nav => {
        // Show/hide elements based on auth
        nav.querySelectorAll('[data-auth="true"]').forEach(el => {
            el.style.display = isLoggedIn ? 'inline-block' : 'none';
        });
        nav.querySelectorAll('[data-auth="false"]').forEach(el => {
            el.style.display = isLoggedIn ? 'none' : 'inline-block';
        });
    });
}

// Run on load and on auth changes
document.addEventListener('DOMContentLoaded', updateNavigation);

// Listen for storage changes (login/logout from other tabs)
window.addEventListener('storage', (e) => {
    if (e.key === 'token') {
        updateNavigation();
    }
});

// Update when DOM changes
const observer = new MutationObserver(updateNavigation);
observer.observe(document.body, { childList: true, subtree: true });