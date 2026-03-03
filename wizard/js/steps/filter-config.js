/**
 * filter-config.js — Step 3: Pick which columns become sidebar filters.
 */

let filterState = [];

export function renderFilterConfig(columns, container) {
    if (!filterState.length) {
        filterState = columns.map(c => ({
            column: c.name,
            enabled: c.type === 'text' && !['latitude', 'longitude', 'primary_key'].includes(c.role),
            label: titleCase(c.name)
        }));
    }

    container.innerHTML = '';
    filterState.forEach((f, i) => {
        const item = document.createElement('label');
        item.className = 'checklist-item';
        item.innerHTML = `
            <input type="checkbox" ${f.enabled ? 'checked' : ''} data-idx="${i}">
            <span>${esc(f.column)}</span>
            <span class="col-type">${esc(columns.find(c => c.name === f.column)?.type || 'text')}</span>
        `;
        item.querySelector('input').addEventListener('change', e => { filterState[i].enabled = e.target.checked; });
        container.appendChild(item);
    });
}

export function getFilterConfig() {
    return filterState.filter(f => f.enabled).map(f => ({
        column: f.column,
        label: f.label,
        placeholder: `All ${f.label}`
    }));
}

function titleCase(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function esc(s) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(s).replace(/[&<>"']/g, m => map[m]);
}
