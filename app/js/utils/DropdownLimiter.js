/**
 * DropdownLimiter - Constrains native <select> dropdowns to viewport height.
 * Uses MutationObserver to apply to dynamically created selects.
 */

class DropdownLimiter {
    constructor() { this.observer = null; }

    init() {
        this.applyToAll();
        this.observer = new MutationObserver(() => this.applyToAll());
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    applyToAll() {
        document.querySelectorAll('select').forEach(sel => {
            if (!sel.dataset.limited) {
                sel.size = Math.min(sel.options.length, 20);
                sel.dataset.limited = 'true';
            }
        });
    }

    destroy() { this.observer?.disconnect(); }
}

export default DropdownLimiter;
