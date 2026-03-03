/**
 * ConfigLoader - Loads, validates, and provides the webgis.config.json configuration.
 *
 * This is the heart of the platform: a single JSON file drives the entire application.
 * Every module reads from this config instead of having hardcoded domain logic.
 */

const REQUIRED_FIELDS = [
    'project.title',
    'database.tableName',
    'database.latitudeColumn',
    'database.longitudeColumn',
    'database.columns',
    'filters',
    'tooltip',
    'detailModal',
    'statistics',
    'map.center',
    'map.zoom'
];

class ConfigLoader {
    constructor() {
        this.config = null;
        this.errors = [];
    }

    /**
     * Load configuration from geodbs.config.json
     * @returns {Promise<Object>} The validated configuration
     */
    async load() {
        try {
            const response = await fetch('./webgis.config.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
            }
            const config = await response.json();
            this.config = this.applyDefaults(config);
            this.validate();
            if (this.errors.length > 0) {
                console.warn('⚠️ ConfigLoader: Validation warnings:', this.errors);
            }
            return this.config;
        } catch (error) {
            console.error('❌ ConfigLoader: Failed to load configuration', error);
            throw new Error(
                'Could not load webgis.config.json. ' +
                'Make sure the file exists in the app directory. ' +
                'Use the Setup Wizard to generate one.'
            );
        }
    }

    /**
     * Apply default values for optional fields
     */
    applyDefaults(config) {
        const defaults = {
            version: '1.0',
            project: {
                title: 'WebGIS',
                shortTitle: 'WebGIS',
                description: '',
                citation: '',
                contactEmail: '',
                institution: '',
                githubUrl: '',
                ...config.project
            },
            supabase: {
                url: '',
                anonKey: '',
                ...config.supabase
            },
            database: {
                tableName: '',
                primaryKey: 'id',
                latitudeColumn: 'latitude',
                longitudeColumn: 'longitude',
                columns: [],
                ...config.database
            },
            filters: config.filters || [],
            tooltip: config.tooltip || [],
            detailModal: config.detailModal || [],
            statistics: config.statistics || [],
            map: {
                center: [38.5, 23.7],
                zoom: 6,
                minZoom: 2,
                maxZoom: 18,
                markerStyle: 'uniform',
                markerColor: '#000000',
                markerColorColumn: null,
                markerColorMap: null,
                clusterRadius: 40,
                ...config.map
            },
            features: {
                measurementTool: true,
                queryBuilder: true,
                globalSearch: true,
                submitData: true,
                reportBug: true,
                submitSuggestion: true,
                welcomeModal: true,
                ...config.features
            },
            search: {
                columns: [],
                ...config.search
            }
        };

        // If no search columns specified, derive from columns with "search" role
        if (defaults.search.columns.length === 0 && defaults.database.columns.length > 0) {
            defaults.search.columns = defaults.database.columns
                .filter(c => c.role && c.role.includes('search'))
                .map(c => c.name);
        }

        return defaults;
    }

    /**
     * Validate the configuration
     */
    validate() {
        this.errors = [];

        for (const path of REQUIRED_FIELDS) {
            const value = this.getNestedValue(this.config, path);
            if (value === undefined || value === null || value === '') {
                // Arrays are OK if empty for some fields, but not for critical ones
                if (Array.isArray(value) && value.length === 0 && path.includes('columns')) {
                    this.errors.push(`${path} is empty — the app needs at least one column defined`);
                } else if (value === undefined || value === null || value === '') {
                    this.errors.push(`Missing required config: ${path}`);
                }
            }
        }

        // Validate filters reference existing columns
        const columnNames = new Set(this.config.database.columns.map(c => c.name));
        for (const filter of this.config.filters) {
            if (!columnNames.has(filter.column)) {
                this.errors.push(`Filter references unknown column: ${filter.column}`);
            }
        }

        // Validate lat/lon columns exist
        if (!columnNames.has(this.config.database.latitudeColumn)) {
            this.errors.push(`Latitude column "${this.config.database.latitudeColumn}" not found in columns`);
        }
        if (!columnNames.has(this.config.database.longitudeColumn)) {
            this.errors.push(`Longitude column "${this.config.database.longitudeColumn}" not found in columns`);
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Get the full config
     */
    get() {
        return this.config;
    }

    /**
     * Get RPC function names derived from table name
     */
    getRpcNames() {
        const t = this.config.database.tableName;
        const filterFns = {};
        for (const filter of this.config.filters) {
            filterFns[filter.column] = `api_${t}_filter_${filter.column}`;
        }
        return {
            count: `api_${t}_count`,
            markers: `api_${t}_markers`,
            details: `api_${t}_details`,
            filters: filterFns
        };
    }

    /**
     * Build the RPC parameter map for the markers function.
     * Each filter column gets a parameter named p_{column}.
     */
    getMarkerParams(activeFilters) {
        const params = {};
        for (const filter of this.config.filters) {
            const col = filter.column;
            const paramName = `p_${col}`;
            const val = activeFilters[col];
            if (filter.type === 'number' || filter.type === 'integer') {
                params[paramName] = val !== null && val !== undefined && val !== ''
                    ? parseInt(val, 10) : null;
            } else {
                params[paramName] = val ?? null;
            }
        }
        return params;
    }

    /**
     * Build cross-filter parameters for a specific filter column.
     * Include all OTHER filter values (excluding the column being filtered).
     */
    getCrossFilterParams(filterColumn, activeFilters) {
        const params = {};
        for (const filter of this.config.filters) {
            if (filter.column === filterColumn) continue;
            const paramName = `p_${filter.column}`;
            const val = activeFilters[filter.column];
            if (filter.type === 'number' || filter.type === 'integer') {
                params[paramName] = val !== null && val !== undefined && val !== ''
                    ? parseInt(val, 10) : null;
            } else {
                params[paramName] = val ?? null;
            }
        }
        return params;
    }
}

export default ConfigLoader;
