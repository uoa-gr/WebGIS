/**
 * GlobalSearch - Searches across all configured columns in the local dataset.
 */

import { escapeHtml } from '../utils/helpers.js';

class GlobalSearch {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.input = null;
        this.resultsList = null;
    }

    init(inputEl, resultsEl) {
        this.input = inputEl;
        this.resultsList = resultsEl;

        this.input.addEventListener('input', () => {
            const query = this.input.value.trim();
            if (query.length < 2) { this.resultsList.innerHTML = ''; this.resultsList.style.display = 'none'; return; }
            this.search(query);
        });

        document.addEventListener('click', e => {
            if (!this.resultsList.contains(e.target) && e.target !== this.input) {
                this.resultsList.style.display = 'none';
            }
        });
    }

    search(query) {
        const data = this.stateManager.get('currentData') || [];
        const lower = query.toLowerCase();
        const columns = this.config.search?.columns || this.config.database.columns.map(c => c.name);

        const results = data.filter(row =>
            columns.some(c => row[c] != null && String(row[c]).toLowerCase().includes(lower))
        ).slice(0, 50);

        this.renderResults(results, query);
    }

    renderResults(results, query) {
        this.resultsList.innerHTML = '';
        if (!results.length) {
            this.resultsList.innerHTML = '<li class="no-results">No results found</li>';
            this.resultsList.style.display = 'block';
            return;
        }

        const displayCols = this.config.search?.displayColumns || this.config.tooltip?.map(t => t.column) || ['id'];
        const idCol = this.config.database.primaryKey || 'id';

        for (const row of results) {
            const li = document.createElement('li');
            li.className = 'search-result-item';
            li.innerHTML = displayCols.map(c => `<span>${escapeHtml(String(row[c] ?? ''))}</span>`).join(' | ');
            li.addEventListener('click', () => {
                this.eventBus.emit('marker:click', { id: row[idCol], row });
                this.resultsList.style.display = 'none';
                this.input.value = '';
            });
            this.resultsList.appendChild(li);
        }
        this.resultsList.style.display = 'block';
    }
}

export default GlobalSearch;
