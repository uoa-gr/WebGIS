/**
 * UIController - Top-level orchestrator that wires all modules together.
 *
 * Reads from ConfigLoader, initialises every UI/data/map component,
 * and routes events between them.
 */

import ConfigLoader from '../ConfigLoader.js';
import EventBus from '../core/EventBus.js';
import StateManager from '../core/StateManager.js';
import CacheManager from '../core/CacheManager.js';
import DataManager from '../data/DataManager.js';
import StatsManager from '../data/StatsManager.js';
import MapManager from '../map/MapManager.js';
import MarkerManager from '../map/MarkerManager.js';
import MeasurementTool from '../map/MeasurementTool.js';
import FilterManager from './FilterManager.js';
import FilterDisplay from './FilterDisplay.js';
import GlobalSearch from './GlobalSearch.js';
import QueryBuilder from './QueryBuilder.js';
import ModalManager from './ModalManager.js';
import MobileControls from './MobileControls.js';
import StatusBar from './StatusBar.js';
import EmailHelper from '../utils/EmailHelper.js';

class UIController {
    constructor() {
        this.configLoader = new ConfigLoader();
        this.eventBus = new EventBus();
    }

    async init() {
        // 1. Load config
        const config = await this.configLoader.load();
        if (!config) { document.body.innerHTML = '<h1>Config load failed.</h1>'; return; }

        // 2. Core
        const stateManager = new StateManager(this.eventBus);
        const cacheManager = new CacheManager();
        stateManager.initFromConfig(config);

        // 3. Apply project metadata
        document.title = config.project.title;
        const headerTitle = document.getElementById('header-title');
        if (headerTitle) headerTitle.textContent = config.project.title;
        const headerSubtitle = document.getElementById('header-subtitle');
        if (headerSubtitle) headerSubtitle.textContent = config.project.description || '';

        // 4. Data layer
        const dataManager = new DataManager(this.eventBus, cacheManager, stateManager, this.configLoader);
        const statsManager = new StatsManager(this.eventBus, stateManager, config);
        const emailHelper = new EmailHelper(config);

        // 5. Map
        const mapManager = new MapManager(this.eventBus, stateManager, config);
        const map = mapManager.init('map');
        const markerManager = new MarkerManager(this.eventBus, stateManager, config);
        markerManager.init(map);
        const measurementTool = new MeasurementTool(map);

        // 6. UI
        const filterManager = new FilterManager(this.eventBus, stateManager, config);
        const filterDisplay = new FilterDisplay(this.eventBus, stateManager, config);
        const globalSearch = new GlobalSearch(this.eventBus, stateManager, config);
        const queryBuilder = new QueryBuilder(this.eventBus, stateManager, config);
        const modalManager = new ModalManager(this.eventBus, config);
        const mobileControls = new MobileControls(this.eventBus, stateManager);
        const statusBar = new StatusBar(this.eventBus, stateManager, config);

        // 7. Init UI that needs DOM refs
        filterManager.render(document.getElementById('filters-container'));
        filterDisplay.init(document.getElementById('filter-display'));
        if (document.getElementById('search-input') && document.getElementById('search-results')) {
            globalSearch.init(document.getElementById('search-input'), document.getElementById('search-results'));
        }
        if (document.getElementById('query-builder-panel')) {
            queryBuilder.init(document.getElementById('query-builder-panel'));
        }
        mobileControls.init();
        statusBar.init(document.getElementById('status-bar'));

        // 8. Measurement button
        const measureBtn = document.getElementById('btn-measure');
        if (measureBtn) measureBtn.addEventListener('click', () => measurementTool.toggle());
        const clearMeasureBtn = document.getElementById('btn-clear-measure');
        if (clearMeasureBtn) clearMeasureBtn.addEventListener('click', () => measurementTool.clear());

        // 9. Email / action buttons
        document.getElementById('btn-download-csv')?.addEventListener('click', () => emailHelper.downloadCSVTemplate());
        document.getElementById('btn-submit-data')?.addEventListener('click', () => emailHelper.openSubmitDataEmail());
        document.getElementById('btn-report-bug')?.addEventListener('click', () => emailHelper.openReportBugEmail());
        document.getElementById('btn-suggestion')?.addEventListener('click', () => emailHelper.openSuggestionEmail());

        // 10. Event wiring
        this.eventBus.on('filter:changed', async ({ activeFilters }) => {
            stateManager.set('isLoading', true);
            const data = await dataManager.fetchData(activeFilters);
            markerManager.render(data);
            statsManager.compute(data);
            await dataManager.fetchFilterOptions(activeFilters);
            stateManager.set('isLoading', true, false);
        });

        this.eventBus.on('filter:remove', ({ column }) => {
            const filters = { ...stateManager.get('activeFilters'), [column]: null };
            stateManager.set('activeFilters', filters);
            this.eventBus.emit('filter:changed', { activeFilters: filters });
        });

        this.eventBus.on('filter:clearAll', () => {
            filterManager.reset();
            this.eventBus.emit('filter:changed', { activeFilters: stateManager.get('activeFilters') });
        });

        this.eventBus.on('marker:click', async ({ id }) => {
            const record = await dataManager.fetchDetails(id);
            if (record) modalManager.show(record);
        });

        this.eventBus.on('sql:applied', async ({ sql }) => {
            stateManager.set('isLoading', true);
            try {
                const { data, error } = await window.supabaseClient
                    .from(config.database.tableName)
                    .select('*')
                    .or(sql);
                if (error) throw error;
                stateManager.set('currentData', data);
                markerManager.render(data);
                statsManager.compute(data);
                dataManager.emitFilterOptionsFromData(data);
            } catch (e) {
                console.error('SQL filter error', e);
            }
            stateManager.set('isLoading', false);
        });

        this.eventBus.on('sql:cleared', () => {
            this.eventBus.emit('filter:changed', { activeFilters: stateManager.get('activeFilters') });
        });

        // Reset button
        document.getElementById('btn-reset')?.addEventListener('click', () => {
            filterManager.reset();
            queryBuilder.clear();
            this.eventBus.emit('filter:changed', { activeFilters: stateManager.get('activeFilters') });
        });

        // 11. Init Supabase and initial data load
        const supa = config.supabase;
        if (supa.url && supa.anonKey) {
            window.supabaseClient = window.supabase.createClient(supa.url, supa.anonKey);
            const ok = await dataManager.init();
            if (ok) {
                const data = await dataManager.fetchData({});
                markerManager.render(data);
                statsManager.compute(data);
                await dataManager.fetchFilterOptions({});
            }
        } else {
            document.body.innerHTML = '<h1>Supabase not configured. Check your config.</h1>';
        }

        // Stats renderer
        this.eventBus.on('stats:computed', ({ stats, totalCount }) => {
            const el = document.getElementById('stats-container');
            if (!el) return;
            el.innerHTML = '';
            for (const [label, value] of Object.entries(stats)) {
                const stat = document.createElement('div');
                stat.className = 'stat-item';
                stat.innerHTML = `<div class="stat-value">${value}</div><div class="stat-label">${label}</div>`;
                el.appendChild(stat);
            }
        });

        stateManager.subscribe('isLoading', loading => {
            document.getElementById('loading-indicator')?.classList.toggle('active', loading);
        });

        console.log(`${config.project.title} initialized.`);
    }
}

export default UIController;
