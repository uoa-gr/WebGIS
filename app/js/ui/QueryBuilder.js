/**
 * QueryBuilder - Live SQL WHERE-clause builder for advanced users.
 * Constructs Supabase PostgREST-compatible filter syntax.
 */

import { escapeHtml } from '../utils/helpers.js';

class QueryBuilder {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.panel = null;
        this.input = null;
    }

    init(panelEl) {
        this.panel = panelEl;

        const label = document.createElement('label');
        label.textContent = 'SQL Filter';
        label.className = 'query-builder-label';

        this.input = document.createElement('textarea');
        this.input.className = 'query-builder-input';
        this.input.placeholder = `e.g. ${this.config.database.tableName}.column_name = 'value'`;
        this.input.rows = 3;

        const btnRow = document.createElement('div');
        btnRow.className = 'query-builder-actions';

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'btn btn-primary';
        applyBtn.addEventListener('click', () => this.apply());

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.className = 'btn btn-secondary';
        clearBtn.addEventListener('click', () => this.clear());

        btnRow.appendChild(applyBtn);
        btnRow.appendChild(clearBtn);

        this.panel.appendChild(label);
        this.panel.appendChild(this.input);
        this.panel.appendChild(btnRow);

        this.eventBus.on('sql:clear', () => this.clear());
    }

    apply() {
        const raw = this.input.value.trim();
        if (!raw) return;
        this.stateManager.set('activeSqlFilter', raw);
        this.eventBus.emit('sql:applied', { sql: raw });
    }

    clear() {
        this.input.value = '';
        this.stateManager.set('activeSqlFilter', null);
        this.eventBus.emit('sql:cleared');
    }
}

export default QueryBuilder;
