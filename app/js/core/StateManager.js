/**
 * StateManager - Centralized application state with change subscriptions.
 * Config-driven: initial state shape is built from the loaded configuration.
 */

class StateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.state = {};
        this.subscribers = new Map();
    }

    /** Initialise default state keys from config */
    initFromConfig(config) {
        const activeFilters = {};
        for (const f of config.filters) activeFilters[f.column] = null;

        this.state = {
            currentData: [],
            filterOptions: {},
            activeFilters,
            activeSqlFilter: null,
            isLoading: false,
            visiblePoints: 0,
            isMobileSidebarOpen: false,
            activeTab: 'filters',
            activeModal: null,
            mapInstance: null,
            mapBounds: null,
            selectedRecordId: null,
            markerCount: 0,
            visibleData: []
        };
    }

    get(key) {
        if (!key) return this.state;
        return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), this.state);
    }

    set(key, value, silent = false) {
        if (!key) return;
        const old = this.get(key);
        if (old === value) return;

        const keys = key.split('.');
        const last = keys.pop();
        let target = this.state;
        for (const k of keys) { if (!(k in target)) target[k] = {}; target = target[k]; }
        target[last] = value;

        if (!silent) {
            this.notifySubscribers(key, value, old);
            this.eventBus.emit('state:changed', { key, value, oldValue: old });
        }
    }

    subscribe(key, callback) {
        if (!this.subscribers.has(key)) this.subscribers.set(key, []);
        this.subscribers.get(key).push(callback);
        return () => {
            const arr = this.subscribers.get(key);
            if (arr) { const i = arr.indexOf(callback); if (i !== -1) arr.splice(i, 1); }
        };
    }

    notifySubscribers(key, value, old) {
        const subs = this.subscribers.get(key);
        if (subs) for (const cb of [...subs]) { try { cb(value, old); } catch (e) { console.error('StateManager subscriber error', e); } }
    }
}

export default StateManager;
