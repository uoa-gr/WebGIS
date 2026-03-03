/**
 * StatusBar - Renders the bottom status bar showing visible/total counts.
 */

class StatusBar {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.el = null;

        this.eventBus.on('markers:rendered', ({ count }) => this.update(count));
    }

    init(containerEl) {
        this.el = containerEl;
    }

    update(visibleCount) {
        if (!this.el) return;
        const total = (this.stateManager.get('currentData') || []).length;
        const unit = this.config.project.unit || 'records';
        this.el.textContent = `${visibleCount.toLocaleString()} of ${total.toLocaleString()} ${unit} visible`;
    }
}

export default StatusBar;
