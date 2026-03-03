/**
 * CacheManager - TTL-based in-memory caching layer.
 */

class CacheManager {
    constructor() { this.cache = new Map(); }

    set(key, value, ttl = null) {
        this.cache.set(key, { value, timestamp: Date.now(), ttl });
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        const entry = this.cache.get(key);
        if (entry.ttl !== null && Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    has(key) { return this.get(key) !== undefined; }

    invalidate(key) { this.cache.delete(key); }

    clear() { this.cache.clear(); }
}

export default CacheManager;
