/**
 * MobileControls - Hamburger menu, mobile sidebar toggle, tab switching.
 */

class MobileControls {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
    }

    init() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const tabs = document.querySelectorAll('.sidebar-tab');

        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                const open = !sidebar.classList.contains('open');
                sidebar.classList.toggle('open', open);
                overlay?.classList.toggle('active', open);
                this.stateManager.set('isMobileSidebarOpen', open);
            });
        }

        overlay?.addEventListener('click', () => {
            sidebar?.classList.remove('open');
            overlay.classList.remove('active');
            this.stateManager.set('isMobileSidebarOpen', false);
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`panel-${target}`)?.classList.add('active');
                this.stateManager.set('activeTab', target);
            });
        });
    }
}

export default MobileControls;
