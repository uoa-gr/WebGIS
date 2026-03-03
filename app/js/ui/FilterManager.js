/**
 * FilterManager - Creates and manages filter UI from config.filters definitions.
 *
 * Each filter entry: { column, label, type: 'select'|'multiselect'|'range', placeholder? }
 */

import { escapeHtml } from '../utils/helpers.js';

class FilterManager {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.filterElements = {};

        this.eventBus.on('filterOptions:loaded', ({ options, allOptions, selectedFilters }) => {
            this.updateOptions(options, allOptions, selectedFilters);
        });
    }

    /** Build all filter <select> elements inside the container */
    render(container) {
        container.innerHTML = '';

        for (const f of this.config.filters) {
            const group = document.createElement('div');
            group.className = 'filter-group';

            const label = document.createElement('label');
            label.textContent = f.label || f.column;
            label.setAttribute('for', `filter-${f.column}`);

            const select = document.createElement('select');
            select.id = `filter-${f.column}`;
            select.dataset.column = f.column;
            select.innerHTML = `<option value="">${escapeHtml(f.placeholder || `All ${f.label || f.column}`)}</option>`;

            select.addEventListener('change', () => {
                const value = select.value || null;
                const filters = { ...this.stateManager.get('activeFilters'), [f.column]: value };
                this.stateManager.set('activeFilters', filters);
                this.eventBus.emit('filter:changed', { column: f.column, value, activeFilters: filters });
            });

            group.appendChild(label);
            group.appendChild(select);
            container.appendChild(group);
            this.filterElements[f.column] = select;
        }
    }

    /** Populate dropdowns with cross-filtered values */
    updateOptions(options, allOptions, selectedFilters) {
        for (const f of this.config.filters) {
            const el = this.filterElements[f.column];
            if (!el) continue;

            const currentVal = el.value;
            const availableValues = options[f.column] || [];
            const allValues = (allOptions && allOptions[f.column]) || availableValues;
            const hasSelection = selectedFilters[f.column] != null && selectedFilters[f.column] !== '';

            el.innerHTML = `<option value="">${escapeHtml(f.placeholder || `All ${f.label || f.column}`)}</option>`;

            for (const v of allValues) {
                const isAvailable = availableValues.includes(v);
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                if (!isAvailable && !hasSelection) { opt.disabled = true; opt.className = 'option-unavailable'; }
                if (String(v) === String(currentVal)) opt.selected = true;
                el.appendChild(opt);
            }
        }
    }

    reset() {
        for (const el of Object.values(this.filterElements)) el.value = '';
        const empty = {};
        for (const f of this.config.filters) empty[f.column] = null;
        this.stateManager.set('activeFilters', empty);
    }

    getActiveFilters() { return this.stateManager.get('activeFilters'); }
}

export default FilterManager;
