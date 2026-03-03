/**
 * data-generator.js — Generates INSERT statements from the CSV rows.
 */

export function generateDataSQL({ columns, rows, tableName }) {
    if (!rows.length) return '-- No data rows to insert.\n';

    const colNames = columns.map(c => c.name);
    let sql = `-- Data INSERT for "${tableName}" (${rows.length} rows)\n\n`;

    // Batch inserts for efficiency
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        sql += `INSERT INTO ${ident(tableName)} (${colNames.map(ident).join(', ')})\nVALUES\n`;
        const values = batch.map(row => {
            const vals = colNames.map(c => sqlLiteral(row[c], columns.find(col => col.name === c)?.type));
            return `    (${vals.join(', ')})`;
        });
        sql += values.join(',\n');
        sql += `;\n\n`;
    }

    return sql;
}

function sqlLiteral(value, type) {
    if (value == null || value === '') return 'NULL';
    if (type === 'integer' || type === 'numeric') {
        const n = Number(value);
        return isNaN(n) ? 'NULL' : String(n);
    }
    if (type === 'boolean') {
        return value === 'true' || value === '1' || value === 'yes' ? 'true' : 'false';
    }
    // Text — escape single quotes
    return `'${String(value).replace(/'/g, "''")}'`;
}

function ident(name) {
    if (/^[a-z_][a-z0-9_]*$/.test(name)) return name;
    return `"${name.replace(/"/g, '""')}"`;
}
