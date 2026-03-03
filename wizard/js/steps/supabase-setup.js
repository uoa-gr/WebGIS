/**
 * supabase-setup.js — Handles Supabase connection testing and automatic data insertion.
 *
 * Schema creation (CREATE TABLE, etc.) must be done via the Supabase SQL Editor.
 * The wizard generates the SQL and gives the user a copy-paste experience.
 * Data insertion is then handled automatically via the Supabase JS client.
 */

let client = null;

/**
 * Test that the Supabase credentials work and the table exists.
 */
export async function testConnection(url, anonKey, tableName) {
    try {
        if (!url || !anonKey) return { ok: false, message: 'Enter both URL and anon key.' };
        if (!url.includes('.supabase.co')) return { ok: false, message: 'URL should look like https://xxxxx.supabase.co' };

        client = window.supabase.createClient(url, anonKey);

        // Try selecting from the table to confirm it exists
        const { error } = await client.from(tableName).select('*').limit(1);
        if (error) {
            if (error.message.includes('does not exist') || error.code === '42P01') {
                return { ok: false, message: `Table "${tableName}" not found. Run the setup SQL first.`, tableExists: false };
            }
            return { ok: false, message: `Connection error: ${error.message}` };
        }
        return { ok: true, message: `Connected. Table "${tableName}" found.`, tableExists: true };
    } catch (err) {
        return { ok: false, message: `Connection failed: ${err.message}` };
    }
}

/**
 * Insert all CSV rows into the Supabase table.
 * Expects the table to already exist (created via the SQL Editor).
 * The setup SQL includes an INSERT RLS policy so the anon key can write.
 */
export async function insertData({ url, anonKey, tableName, columns, rows }, onStatus) {
    if (!client) {
        client = window.supabase.createClient(url, anonKey);
    }

    const log = (msg, type = 'info') => onStatus?.({ message: msg, type });

    if (!rows.length) {
        log('No data rows to insert.', 'warn');
        return { ok: true };
    }

    const pk = columns.find(c => c.role === 'primary_key');
    const BATCH = 500;
    let inserted = 0;

    try {
        for (let i = 0; i < rows.length; i += BATCH) {
            const batch = rows.slice(i, i + BATCH);
            const cleanBatch = batch.map(row => {
                const clean = {};
                for (const col of columns) {
                    // Skip auto-generated primary key
                    if (pk && col.name === pk.name) continue;

                    let val = row[col.name];
                    if (val === '' || val == null) {
                        clean[col.name] = null;
                    } else if (col.type === 'integer') {
                        const n = parseInt(val, 10);
                        clean[col.name] = isNaN(n) ? null : n;
                    } else if (col.type === 'numeric') {
                        const n = parseFloat(val);
                        clean[col.name] = isNaN(n) ? null : n;
                    } else if (col.type === 'boolean') {
                        clean[col.name] = val === 'true' || val === '1' || val === 'yes';
                    } else {
                        clean[col.name] = String(val);
                    }
                }
                return clean;
            });

            const { error } = await client.from(tableName).insert(cleanBatch);
            if (error) {
                log(`Error at rows ${i + 1}\u2013${i + batch.length}: ${error.message}`, 'error');
                return { ok: false, inserted };
            }
            inserted += batch.length;
            log(`Inserted ${inserted} of ${rows.length} rows...`);
        }

        log(`All ${rows.length} rows inserted successfully.`, 'success');
        return { ok: true, inserted };

    } catch (err) {
        log(`Unexpected error: ${err.message}`, 'error');
        return { ok: false, inserted };
    }
}

/**
 * Extract the project ref from a Supabase URL for linking to the dashboard.
 */
export function getProjectRef(url) {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
}

/**
 * Get a direct link to the Supabase SQL Editor for the given project.
 */
export function getSqlEditorLink(url) {
    const ref = getProjectRef(url);
    return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : 'https://supabase.com/dashboard';
}
