/**
 * DataManager - Config-driven data layer for all Supabase operations.
 *
 * Reads table name, column definitions, and filter specs from the config.
 * Constructs RPC calls dynamically — no hardcoded domain references.
 */

import { escapeHtml } from '../utils/helpers.js';

class DataManager {
    constructor(eventBus, cacheManager, stateManager, configLoader) {
        this.eventBus = eventBus;
        this.cacheManager = cacheManager;
        this.stateManager = stateManager;
        this.configLoader = configLoader;
        this.config = configLoader.get();
        this.rpc = configLoader.getRpcNames();
        this.supabase = null;
        this.BATCH_SIZE = 1000;
        this.FILTER_CACHE_TTL = 5 * 60 * 1000;
        this.DETAILS_CACHE_TTL = 30 * 60 * 1000;
        this.allOptions = null;
    }

    async init() {
        this.supabase = window.supabaseClient;
        if (!this.supabase) {
            this.eventBus.emit('data:error', { error: new Error('Database not configured'), context: 'init' });
            return false;
        }
        return this.testConnection();
    }

    async testConnection() {
        try {
            const { data: count, error } = await this.supabase.rpc(this.rpc.count);
            if (error) { this.eventBus.emit('data:error', { error, context: 'connection_test' }); return false; }
            return true;
        } catch (error) {
            this.eventBus.emit('data:error', { error, context: 'connection_test' });
            return false;
        }
    }

    /* ── Main data fetch ── */

    async fetchData(activeFilters = {}) {
        if (!this.supabase) throw new Error('Database not initialized');
        const params = this.configLoader.getMarkerParams(activeFilters);
        const query = this.supabase.rpc(this.rpc.markers, params);
        const rows = await this.fetchAllRecords(query);
        this.stateManager.set('currentData', rows);
        this.eventBus.emit('data:loaded', { data: rows, filters: activeFilters, count: rows.length });
        return rows;
    }

    /* ── Filter options with cross-filtering ── */

    async fetchFilterOptions(selectedFilters = {}) {
        if (!this.supabase) throw new Error('Database not initialized');

        // Fetch all (unfiltered) once
        if (!this.allOptions) {
            const cached = this.cacheManager.get('allFilterOptions');
            if (cached) { this.allOptions = cached; }
            else {
                const promises = this.config.filters.map(f => this.fetchFilterColumn(f.column, {}));
                const results = await Promise.all(promises);
                this.allOptions = {};
                this.config.filters.forEach((f, i) => { this.allOptions[f.column] = results[i]; });
                this.cacheManager.set('allFilterOptions', this.allOptions, this.FILTER_CACHE_TTL);
            }
        }

        // Empty selection → return cached full set
        const hasSelection = Object.values(selectedFilters).some(v => v !== null && v !== '');
        if (!hasSelection) {
            const cached = this.cacheManager.get('filterOptions');
            if (cached) {
                this.eventBus.emit('filterOptions:loaded', { options: cached, allOptions: this.allOptions, selectedFilters });
                return cached;
            }
        }

        // Cross-filtered fetch
        const promises = this.config.filters.map(f => this.fetchFilterColumn(f.column, selectedFilters));
        const results = await Promise.all(promises);
        const options = {};
        this.config.filters.forEach((f, i) => { options[f.column] = results[i]; });

        if (!hasSelection) this.cacheManager.set('filterOptions', options, this.FILTER_CACHE_TTL);

        this.eventBus.emit('filterOptions:loaded', { options, allOptions: this.allOptions, selectedFilters });
        return options;
    }

    async fetchFilterColumn(column, selectedFilters) {
        const rpcName = this.rpc.filters[column];
        if (!rpcName) return [];
        const params = this.configLoader.getCrossFilterParams(column, selectedFilters);
        const query = this.supabase.rpc(rpcName, params);
        const rows = await this.fetchAllRecords(query);
        return this.getUniqueValues(rows, column);
    }

    /* ── Single record detail ── */

    async fetchDetails(recordId) {
        const cacheKey = `detail_${recordId}`;
        const cached = this.cacheManager.get(cacheKey);
        if (cached) return cached;

        const { data, error } = await this.supabase.rpc(this.rpc.details, { p_id: recordId });
        if (error) throw error;
        const record = Array.isArray(data) ? data[0] : data;
        if (record) this.cacheManager.set(cacheKey, record, this.DETAILS_CACHE_TTL);
        return record;
    }

    /* ── Emit filter options from an already-fetched dataset (for SQL filter) ── */

    emitFilterOptionsFromData(data) {
        const options = {};
        for (const f of this.config.filters) {
            options[f.column] = [...new Set(data.map(r => r[f.column]).filter(v => v != null))].sort();
        }
        this.eventBus.emit('filterOptions:loaded', { options, allOptions: this.allOptions, selectedFilters: {} });
    }

    /* ── Pagination helper ── */

    async fetchAllRecords(baseQuery) {
        let all = [];
        let from = 0;
        while (true) {
            const { data, error } = await baseQuery.range(from, from + this.BATCH_SIZE - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            all = all.concat(data);
            if (data.length < this.BATCH_SIZE) break;
            from += this.BATCH_SIZE;
        }
        return all;
    }

    getUniqueValues(rows, column) {
        const vals = rows.map(r => r[column]).filter(v => v != null);
        return [...new Set(vals)].sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
    }
}

export default DataManager;
