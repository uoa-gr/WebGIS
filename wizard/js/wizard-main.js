/**
 * wizard-main.js — Orchestrates the multi-step setup wizard.
 */

import { parseCSV } from './steps/csv-parser.js';
import { renderColumnConfig, getColumnConfig } from './steps/column-config.js';
import { renderFilterConfig, getFilterConfig } from './steps/filter-config.js';
import { renderDisplayConfig, getDisplayConfig } from './steps/display-config.js';
import { generateConfig } from './generators/config-generator.js';
import { generateSetupSQL } from './generators/sql-generator.js';
import { generateDataSQL } from './generators/data-generator.js';
import { createSchema, testConnection, insertData } from './steps/supabase-setup.js';
import { downloadZip } from './generators/zip-exporter.js';

const TOTAL_STEPS = 8;
let currentStep = 1;
let csvData = { headers: [], rows: [], raw: '' };
let dataInserted = false;

/* ── Navigation ─────────────────────────────── */

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

btnPrev.addEventListener('click', () => goStep(currentStep - 1));
btnNext.addEventListener('click', () => goStep(currentStep + 1));

function goStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    document.querySelector(`.wizard-step.active`)?.classList.remove('active');
    document.getElementById(`step-${n}`).classList.add('active');

    document.querySelectorAll('.progress-steps .step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.toggle('active', s === n);
        el.classList.toggle('completed', s < n);
    });

    currentStep = n;
    btnPrev.disabled = n === 1;
    btnNext.textContent = n === TOTAL_STEPS ? 'Finish' : 'Next →';
    if (n === TOTAL_STEPS) btnNext.style.display = 'none';
    else btnNext.style.display = '';

    // Trigger step-specific init
    if (n === 2) renderColumnConfig(csvData.headers, document.getElementById('columns-table-wrapper'));
    if (n === 3) renderFilterConfig(getColumnConfig(), document.getElementById('filters-config'));
    if (n === 4) renderDisplayConfig(getColumnConfig(), document.getElementById('tooltip-config'), document.getElementById('modal-config'));
    if (n === 7) initSupabaseStep();
}

/* ── Step 1: CSV Upload ──────────────────────── */

const uploadZone = document.getElementById('upload-zone');
const csvFileInput = document.getElementById('csv-file');

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
csvFileInput.addEventListener('change', () => handleFile(csvFileInput.files[0]));

function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = () => {
        csvData = parseCSV(reader.result);
        showPreview();
    };
    reader.readAsText(file);
}

function showPreview() {
    const wrapper = document.getElementById('preview-table-wrapper');
    const previewRows = csvData.rows.slice(0, 5);
    let html = '<table><thead><tr>';
    for (const h of csvData.headers) html += `<th>${esc(h)}</th>`;
    html += '</tr></thead><tbody>';
    for (const row of previewRows) {
        html += '<tr>';
        for (const h of csvData.headers) html += `<td>${esc(String(row[h] ?? ''))}</td>`;
        html += '</tr>';
    }
    html += '</tbody></table>';
    wrapper.innerHTML = html;
    document.getElementById('upload-stats').textContent = `${csvData.rows.length} rows, ${csvData.headers.length} columns`;
    document.getElementById('upload-preview').style.display = 'block';
}

/* ── Step 7: Supabase Setup ───────────────────── */

let schemaCreated = false;

function initSupabaseStep() {
    // Reset insert button state based on schema status
    document.getElementById('btn-sb-insert').disabled = !schemaCreated;
}

document.getElementById('btn-sb-create').addEventListener('click', async () => {
    const url = document.getElementById('sb-url').value.trim();
    const token = document.getElementById('sb-access-token').value.trim();
    const columns = getColumnConfig();
    const filters = getFilterConfig();
    const project = getProjectInfo();
    const sql = generateSetupSQL({ columns, filters, tableName: project.tableName });

    if (!url || !token) {
        showStatus('Enter your Project URL and Access Token.', 'error');
        return;
    }

    const btn = document.getElementById('btn-sb-create');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    showStatus('Creating database schema...');

    const result = await createSchema({ supabaseUrl: url, accessToken: token, sql });
    showStatus(result.message, result.ok ? 'success' : 'error');

    btn.disabled = false;
    btn.textContent = 'Create Database';

    if (result.ok) {
        schemaCreated = true;
        document.getElementById('btn-sb-insert').disabled = false;
    }
});

document.getElementById('btn-sb-insert').addEventListener('click', async () => {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-anon-key').value.trim();
    const columns = getColumnConfig();
    const project = getProjectInfo();

    if (!url || !key) {
        showStatus('Enter your Project URL and Anon Key.', 'error');
        return;
    }

    document.getElementById('btn-sb-insert').disabled = true;
    showStatus('Inserting data...');

    const result = await insertData(
        { url, anonKey: key, tableName: project.tableName, columns, rows: csvData.rows },
        ({ message, type }) => showStatus(message, type)
    );

    dataInserted = result.ok;
    if (result.ok) {
        showStatus(`Done! ${result.inserted} rows inserted.`, 'success');
    }
});

function showStatus(msg, type = 'info') {
    const container = document.getElementById('sb-status');
    const log = document.getElementById('sb-log');
    container.style.display = 'block';
    const entry = document.createElement('div');
    entry.className = `sb-log-entry sb-${type}`;
    entry.textContent = msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

/* ── Step 8: Download ─────────────────────────── */

function buildConfig() {
    const columns = getColumnConfig();
    const filters = getFilterConfig();
    const display = getDisplayConfig();
    const project = getProjectInfo();
    const mapSettings = getMapSettings();
    const supabaseUrl = document.getElementById('sb-url').value.trim();
    const supabaseAnonKey = document.getElementById('sb-anon-key').value.trim();
    return generateConfig({ columns, filters, display, project, mapSettings, supabaseUrl, supabaseAnonKey });
}

document.getElementById('btn-download-zip').addEventListener('click', async () => {
    const config = buildConfig();
    const project = getProjectInfo();

    const btn = document.getElementById('btn-download-zip');
    btn.disabled = true;
    btn.textContent = 'Building ZIP...';
    try {
        await downloadZip(config, project.title);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Download ZIP';
    }
});

// Individual file exports (advanced)
document.getElementById('btn-export-config').addEventListener('click', () => {
    const config = buildConfig();
    download('webgis.config.json', JSON.stringify(config, null, 4));
});

document.getElementById('btn-export-sql').addEventListener('click', () => {
    const columns = getColumnConfig();
    const filters = getFilterConfig();
    const project = getProjectInfo();
    const sql = generateSetupSQL({ columns, filters, tableName: project.tableName });
    download('setup.sql', sql);
});

document.getElementById('btn-export-data').addEventListener('click', () => {
    const columns = getColumnConfig();
    const project = getProjectInfo();
    const sql = generateDataSQL({ columns, rows: csvData.rows, tableName: project.tableName });
    download('data.sql', sql);
});

function getProjectInfo() {
    return {
        title: document.getElementById('proj-title').value || 'My WebGIS',
        subtitle: document.getElementById('proj-subtitle').value || '',
        tableName: document.getElementById('proj-table').value || 'data',
        unit: document.getElementById('proj-unit').value || 'records',
        email: document.getElementById('proj-email').value || '',
        institution: document.getElementById('proj-institution').value || ''
    };
}

function getMapSettings() {
    return {
        lat: parseFloat(document.getElementById('map-lat').value) || 38.5,
        lng: parseFloat(document.getElementById('map-lng').value) || 23.7,
        zoom: parseInt(document.getElementById('map-zoom').value) || 7,
        color: document.getElementById('map-color').value || '#e74c3c'
    };
}

/* ── Utility ──────────────────────────────────── */

function download(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function esc(s) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return s.replace(/[&<>"']/g, m => map[m]);
}
