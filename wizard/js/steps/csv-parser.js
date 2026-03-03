/**
 * csv-parser.js — Parses CSV text into { headers, rows, raw }.
 * Handles quoted fields, commas inside quotes, and various line endings.
 */

export function parseCSV(text) {
    const raw = text;
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return { headers: [], rows: [], raw };

    const headers = parseLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseLine(line);
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
        rows.push(row);
    }

    return { headers, rows, raw };
}

function parseLine(line) {
    const result = [];
    let i = 0, field = '', inQuotes = false;
    while (i < line.length) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
            else if (ch === '"') { inQuotes = false; i++; }
            else { field += ch; i++; }
        } else {
            if (ch === '"') { inQuotes = true; i++; }
            else if (ch === ',') { result.push(field.trim()); field = ''; i++; }
            else { field += ch; i++; }
        }
    }
    result.push(field.trim());
    return result;
}
