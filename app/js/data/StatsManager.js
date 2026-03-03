/**
 * StatsManager - Computes statistics from config.statistics definitions.
 *
 * Each stat entry specifies: { column, type: 'count'|'unique'|'avg'|'min'|'max'|'range', label }
 */

class StatsManager {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.stats = {};
    }

    compute(data) {
        const defs = this.config.statistics || [];
        this.stats = {};

        for (const def of defs) {
            const vals = data.map(r => r[def.column]).filter(v => v != null && v !== '');
            switch (def.type) {
                case 'count':
                    this.stats[def.label] = data.length;
                    break;
                case 'unique':
                    this.stats[def.label] = new Set(vals).size;
                    break;
                case 'avg': {
                    const nums = vals.map(Number).filter(n => !isNaN(n));
                    this.stats[def.label] = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '-';
                    break;
                }
                case 'min': {
                    const nums = vals.map(Number).filter(n => !isNaN(n));
                    this.stats[def.label] = nums.length ? Math.min(...nums) : '-';
                    break;
                }
                case 'max': {
                    const nums = vals.map(Number).filter(n => !isNaN(n));
                    this.stats[def.label] = nums.length ? Math.max(...nums) : '-';
                    break;
                }
                case 'range': {
                    const nums = vals.map(Number).filter(n => !isNaN(n));
                    if (nums.length) {
                        const min = Math.min(...nums), max = Math.max(...nums);
                        this.stats[def.label] = `${min} – ${max}`;
                    } else {
                        this.stats[def.label] = '-';
                    }
                    break;
                }
                default:
                    this.stats[def.label] = '-';
            }
        }

        this.eventBus.emit('stats:computed', { stats: this.stats, totalCount: data.length });
        return this.stats;
    }
}

export default StatsManager;
