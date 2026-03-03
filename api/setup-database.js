/**
 * POST /api/setup-database
 *
 * Proxies DDL execution to the Supabase Management API so the browser-based
 * wizard can create tables and RPC functions without the user touching SQL.
 *
 * Expected JSON body:
 *   { supabaseUrl: string, accessToken: string, sql: string }
 *
 * The access token is a Supabase personal access token (PAT) created at:
 *   https://supabase.com/dashboard/account/tokens
 */

export default async function handler(req, res) {
    // CORS for the wizard (same-origin in prod, but useful for local dev)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const { supabaseUrl, accessToken, sql } = req.body || {};

    // ── Validate inputs ────────────────────────────
    if (!supabaseUrl || !accessToken || !sql) {
        return res.status(400).json({ ok: false, error: 'Missing required fields: supabaseUrl, accessToken, sql' });
    }

    // Prevent SSRF — only allow *.supabase.co URLs
    const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;
    if (!urlPattern.test(supabaseUrl.replace(/\/$/, '') + '/')) {
        return res.status(400).json({ ok: false, error: 'Invalid Supabase URL format' });
    }

    // Extract project ref from URL
    const refMatch = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
    if (!refMatch) {
        return res.status(400).json({ ok: false, error: 'Could not extract project ref from URL' });
    }
    const projectRef = refMatch[1];

    // ── Call Supabase Management API ───────────────
    try {
        const response = await fetch(
            `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: sql })
            }
        );

        if (!response.ok) {
            const text = await response.text();
            let detail;
            try { detail = JSON.parse(text).message || text; } catch { detail = text; }
            return res.status(response.status).json({ ok: false, error: detail });
        }

        return res.status(200).json({ ok: true });

    } catch (err) {
        return res.status(500).json({ ok: false, error: `Server error: ${err.message}` });
    }
}
