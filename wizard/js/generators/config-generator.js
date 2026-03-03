/**
 * config-generator.js — Produces the webgis.config.json from wizard state.
 */

export function generateConfig({ columns, filters, display, project, mapSettings, supabaseUrl, supabaseAnonKey }) {
    const latCol = columns.find(c => c.role === 'latitude')?.name || 'latitude';
    const lngCol = columns.find(c => c.role === 'longitude')?.name || 'longitude';
    const pkCol = columns.find(c => c.role === 'primary_key')?.name || 'id';

    return {
        version: '1.0',
        project: {
            title: project.title,
            shortTitle: project.title,
            description: project.subtitle,
            contactEmail: project.email,
            institution: project.institution,
            unit: project.unit
        },
        supabase: {
            url: supabaseUrl || 'YOUR_SUPABASE_URL',
            anonKey: supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY'
        },
        database: {
            tableName: project.tableName,
            primaryKey: pkCol,
            latitudeColumn: latCol,
            longitudeColumn: lngCol,
            columns: columns.map(c => ({
                name: c.name,
                type: c.type,
                role: c.role ? [c.role] : []
            }))
        },
        filters,
        tooltip: display.tooltip,
        detailModal: display.detailModal,
        statistics: [
            { column: pkCol, type: 'count', label: `Total ${project.unit || 'Records'}` },
            ...filters.slice(0, 3).map(f => ({ column: f.column, type: 'unique', label: f.label }))
        ],
        map: {
            center: [mapSettings.lat, mapSettings.lng],
            zoom: mapSettings.zoom,
            minZoom: 2,
            maxZoom: 18,
            markerColor: mapSettings.color,
            defaultBaseLayer: 'OpenStreetMap'
        },
        search: {
            columns: columns.filter(c => c.type === 'text' && !['latitude', 'longitude', 'primary_key'].includes(c.role)).map(c => c.name),
            displayColumns: display.tooltip.slice(0, 3).map(t => t.column)
        },
        features: {
            measurementTool: true,
            queryBuilder: true,
            globalSearch: true,
            submitData: true,
            reportBug: true,
            submitSuggestion: true
        }
    };
}
