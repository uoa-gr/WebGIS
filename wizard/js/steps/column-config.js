/**
 * column-config.js — Step 2: Let user set type and role for each CSV column.
 */

let columnsState = [];

const TYPE_OPTIONS = ['text', 'integer', 'numeric', 'boolean', 'date', 'timestamp'];
const ROLE_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'latitude', label: 'Latitude' },
    { value: 'longitude', label: 'Longitude' },
    { value: 'primary_key', label: 'Primary Key' }
];

export function renderColumnConfig(headers, container) {
    if (columnsState.length && columnsState.length === headers.length) {
        // Already initialised — don't reset
        return;
    }

    columnsState = headers.map(h => ({
        name: h,
        type: guessType(h),
        role: guessRole(h)
    }));

    draw(container);
}

function draw(container) {
    let html = '<table><thead><tr><th>Column</th><th>Type</th><th>Role</th></tr></thead><tbody>';
    columnsState.forEach((col, i) => {
        html += `<tr>
            <td>${esc(col.name)}</td>
            <td><select class="col-type-select" data-idx="${i}">
                ${TYPE_OPTIONS.map(t => `<option value="${t}" ${t === col.type ? 'selected' : ''}>${t}</option>`).join('')}
            </select></td>
            <td><select class="col-role-select" data-idx="${i}">
                ${ROLE_OPTIONS.map(r => `<option value="${r.value}" ${r.value === col.role ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('.col-type-select').forEach(sel => {
        sel.addEventListener('change', () => { columnsState[parseInt(sel.dataset.idx)].type = sel.value; });
    });
    container.querySelectorAll('.col-role-select').forEach(sel => {
        sel.addEventListener('change', () => { columnsState[parseInt(sel.dataset.idx)].role = sel.value; });
    });
}

export function getColumnConfig() {
    return columnsState;
}

/* ── Heuristics ── */

function guessType(name) {
    const n = name.toLowerCase();
    if (n === 'id' || n.endsWith('_id')) return 'integer';
    if (n.includes('lat') || n.includes('lon') || n.includes('lng')) return 'numeric';
    if (n.includes('count') || n.includes('casualties') || n.includes('number') || n.includes('year')) return 'integer';
    if (n.includes('date') || n.includes('time')) return 'text';
    return 'text';
}

function guessRole(name) {
    const n = name.toLowerCase();
    if (n === 'id') return 'primary_key';
    if (n === 'latitude' || n === 'lat') return 'latitude';
    if (n === 'longitude' || n === 'lng' || n === 'lon') return 'longitude';
    return '';
}

function esc(s) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(s).replace(/[&<>"']/g, m => map[m]);
}
