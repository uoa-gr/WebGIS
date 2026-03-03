/**
 * display-config.js — Step 4: Tooltip and detail modal field selection.
 */

let tooltipState = [];
let modalState = [];

export function renderDisplayConfig(columns, tooltipContainer, modalContainer) {
    if (!tooltipState.length) {
        tooltipState = columns.map(c => ({
            column: c.name,
            enabled: !['latitude', 'longitude', 'primary_key'].includes(c.role),
            label: titleCase(c.name)
        }));
    }
    if (!modalState.length) {
        modalState = columns.map(c => ({
            column: c.name,
            enabled: true,
            label: titleCase(c.name),
            type: guessFieldType(c)
        }));
    }

    renderCheckList(tooltipState, tooltipContainer);
    renderCheckList(modalState, modalContainer);
}

function renderCheckList(state, container) {
    container.innerHTML = '';
    state.forEach((f, i) => {
        const item = document.createElement('label');
        item.className = 'checklist-item';
        item.innerHTML = `
            <input type="checkbox" ${f.enabled ? 'checked' : ''} data-idx="${i}">
            <span>${esc(f.column)}</span>
        `;
        item.querySelector('input').addEventListener('change', e => { state[i].enabled = e.target.checked; });
        container.appendChild(item);
    });
}

export function getDisplayConfig() {
    return {
        tooltip: tooltipState.filter(f => f.enabled).map(f => ({ column: f.column, label: f.label })),
        detailModal: modalState.filter(f => f.enabled).map(f => ({ column: f.column, label: f.label, type: f.type }))
    };
}

function guessFieldType(col) {
    const n = col.name.toLowerCase();
    if (n.includes('url') || n.includes('link') || n.includes('source')) return 'link';
    if (n.includes('image') || n.includes('photo')) return 'image';
    if (n === 'latitude' || n === 'longitude') return 'coordinates';
    return 'text';
}

function titleCase(s) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function esc(s) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(s).replace(/[&<>"']/g, m => map[m]);
}
