/**
 * supabase-setup.js — Handles automated Supabase database setup.
 *
 * Schema creation (DDL) goes through our Vercel serverless function at /api/setup-database,
 * which proxies the request to the Supabase Management API.
 * Data insertion uses the Supabase JS client with the anon key.
 */

let client = null;

/**
 * Create the database schema (table, RPC functions, RLS, indexes) via the Vercel API.
 */
export async function createSchema({ supabaseUrl, accessToken, sql }) {
    if (!supabaseUrl || !accessToken || !sql) {
        return { ok: false, message: 'Enter URL, access token, and ensure SQL was generated.' };
    }

    try {
        const resp = await fetch('/api/setup-database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supabaseUrl, accessToken, sql })
        });

        const data = await resp.json();
        if (!data.ok) {
            return { ok: false, message: data.error || 'Schema creation failed.' };
        }
        return { ok: true, message: 'Database schema created successfully.' };
    } catch (err) {
        return { ok: false, message: `Request failed: ${err.message}` };
    }
}

/**
 * Test that the Supabase credentials work and the table exists.
 */
export async function testConnection(url, anonKey, tableName) {
    try {
        if (!url || !anonKey) return { ok: false, message: 'Enter both URL and anon key.' };

        client = window.supabase.createClient(url, anonKey);
        const { error } = await client.from(tableName).select('*').limit(1);

        if (error) {
            if (error.message.includes('does not exist') || error.code === '42P01') {
                return { ok: false, message: `Table "${tableName}" not found.`, tableExists: false };
            }
            return { ok: false, message: `Connection error: ${error.message}` };
        }
        return { ok: true, message: `Connected. Table "${tableName}" exists.`, tableExists: true };
    } catch (err) {
        return { ok: false, message: `Connection failed: ${err.message}` };
    }
}

/**
 * Insert all CSV rows into the Supabase table via the JS client.
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
