/**
 * FilterDisplay - Shows currently-active filter tags / chips below the header.
 */

import { escapeHtml } from '../utils/helpers.js';

class FilterDisplay {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.container = null;
    }

    init(containerEl) {
        this.container = containerEl;
        this.eventBus.on('filter:changed', () => this.render());
        this.eventBus.on('sql:applied', () => this.render());
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const filters = this.stateManager.get('activeFilters') || {};
        const sqlFilter = this.stateManager.get('activeSqlFilter');

        let anyActive = false;

        for (const [col, val] of Object.entries(filters)) {
            if (val == null || val === '') continue;
            anyActive = true;
            const label = this.config.filters.find(f => f.column === col)?.label || col;
            this.addChip(`${label}: ${val}`, () => {
                this.eventBus.emit('filter:remove', { column: col });
            });
        }

        if (sqlFilter) {
            anyActive = true;
            this.addChip(`SQL: ${sqlFilter.substring(0, 40)}…`, () => {
                this.eventBus.emit('sql:clear');
            });
        }

        if (anyActive) {
            const clearAll = document.createElement('button');
            clearAll.className = 'filter-chip clear-all';
            clearAll.textContent = 'Clear All';
            clearAll.addEventListener('click', () => this.eventBus.emit('filter:clearAll'));
            this.container.appendChild(clearAll);
        }

        this.container.style.display = anyActive ? 'flex' : 'none';
    }

    addChip(text, onRemove) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.innerHTML = `${escapeHtml(text)} <button class="chip-remove">&times;</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', onRemove);
        this.container.appendChild(chip);
    }
}

export default FilterDisplay;
