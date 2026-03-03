/**
 * Utility functions — pure helpers with no dependencies.
 */

export function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text != null ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}

export function debounce(fn, wait) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

export function throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) { fn.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
    };
}

export function formatNumber(n, locale = 'en-US') {
    return n != null && !isNaN(n) ? n.toLocaleString(locale) : '-';
}
