/**
 * MapManager - Initialises Leaflet map from config.map settings.
 */

class MapManager {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.map = null;
    }

    init(containerId = 'map') {
        const mc = this.config.map;

        this.map = L.map(containerId, {
            center: mc.center,
            zoom: mc.zoom,
            maxZoom: mc.maxZoom || 19,
            minZoom: mc.minZoom || 2,
            zoomControl: false,
            maxBounds: mc.maxBounds || undefined
        });

        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Base layers
        const baseLayers = this.createBaseLayers();
        const defaultLayer = baseLayers[mc.defaultBaseLayer] || baseLayers[Object.keys(baseLayers)[0]];
        defaultLayer.addTo(this.map);

        L.control.layers(baseLayers, null, { position: 'topright' }).addTo(this.map);

        this.map.on('moveend', () => this.eventBus.emit('map:moveend', { bounds: this.map.getBounds() }));

        this.stateManager.set('mapInstance', this.map);
        this.eventBus.emit('map:ready', { map: this.map });

        return this.map;
    }

    createBaseLayers() {
        const custom = this.config.map.baseLayers;
        if (custom && custom.length) {
            const layers = {};
            for (const bl of custom) {
                layers[bl.name] = L.tileLayer(bl.url, {
                    attribution: bl.attribution || '',
                    maxZoom: bl.maxZoom || 19
                });
            }
            return layers;
        }
        // Sensible defaults
        return {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
            }),
            'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '&copy; Esri', maxZoom: 19
            }),
            'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenTopoMap', maxZoom: 17
            })
        };
    }

    fitBounds(bounds, options) { this.map?.fitBounds(bounds, options); }
    getBounds() { return this.map?.getBounds(); }
    invalidateSize() { this.map?.invalidateSize(); }
}

export default MapManager;
