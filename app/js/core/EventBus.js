/**
 * EventBus - Centralized event management for loose coupling between modules.
 * Publish-subscribe pattern: modules emit and listen without direct references.
 */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(eventName, handler) {
        if (!eventName || typeof handler !== 'function') return () => {};
        if (!this.events.has(eventName)) this.events.set(eventName, []);
        this.events.get(eventName).push(handler);
        return () => this.off(eventName, handler);
    }

    off(eventName, handler) {
        if (!this.events.has(eventName)) return;
        const handlers = this.events.get(eventName);
        const i = handlers.indexOf(handler);
        if (i !== -1) handlers.splice(i, 1);
        if (handlers.length === 0) this.events.delete(eventName);
    }

    once(eventName, handler) {
        const wrap = (payload) => { handler(payload); this.off(eventName, wrap); };
        return this.on(eventName, wrap);
    }

    emit(eventName, payload) {
        if (!this.events.has(eventName)) return;
        for (const handler of [...this.events.get(eventName)]) {
            try { handler(payload); }
            catch (err) { console.error(`EventBus: Error in handler for "${eventName}"`, err); }
        }
    }

    clear() { this.events.clear(); }
}

export default EventBus;
