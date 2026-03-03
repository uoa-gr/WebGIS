/**
 * MarkerManager - Creates clustered markers, tooltips and click-to-detail from config.
 *
 * Reads tooltip fields from config.tooltip, colour from config.map.markerColor,
 * lat/lng column names from config.map.latitudeColumn / longitudeColumn.
 */

import { escapeHtml } from '../utils/helpers.js';

class MarkerManager {
    constructor(eventBus, stateManager, config) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.config = config;
        this.markerCluster = null;
        this.map = null;
        this.latCol = config.map.latitudeColumn || 'latitude';
        this.lngCol = config.map.longitudeColumn || 'longitude';
        this.color = config.map.markerColor || '#e74c3c';
        this.idCol = config.database.primaryKey || 'id';
    }

    init(map) {
        this.map = map;
        this.markerCluster = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            chunkedLoading: true,
            chunkInterval: 50,
            chunkDelay: 10,
            iconCreateFunction: cluster => this.createClusterIcon(cluster)
        });
        this.map.addLayer(this.markerCluster);
    }

    createClusterIcon(cluster) {
        const count = cluster.getChildCount();
        let size = 'small', dimension = 36;
        if (count > 100) { size = 'large'; dimension = 52; }
        else if (count > 10) { size = 'medium'; dimension = 44; }

        return L.divIcon({
            html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
            className: 'cluster-wrapper',
            iconSize: L.point(dimension, dimension)
        });
    }

    render(data) {
        if (!this.markerCluster) return;
        this.markerCluster.clearLayers();

        const markers = [];
        for (const row of data) {
            const lat = parseFloat(row[this.latCol]);
            const lng = parseFloat(row[this.lngCol]);
            if (isNaN(lat) || isNaN(lng)) continue;

            const marker = L.circleMarker([lat, lng], {
                radius: 6,
                fillColor: this.color,
                color: '#fff',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.8
            });

            marker.bindTooltip(this.buildTooltip(row), { direction: 'top', offset: [0, -8] });
            marker.on('click', () => this.eventBus.emit('marker:click', { id: row[this.idCol], row }));

            markers.push(marker);
        }

        this.markerCluster.addLayers(markers);
        this.stateManager.set('markerCount', markers.length);
        this.eventBus.emit('markers:rendered', { count: markers.length });
    }

    buildTooltip(row) {
        const fields = this.config.tooltip || [];
        if (!fields.length) return `ID: ${escapeHtml(String(row[this.idCol]))}`;

        return fields.map(f => {
            const label = f.label || f.column;
            const val = row[f.column] != null ? escapeHtml(String(row[f.column])) : 'N/A';
            return `<strong>${escapeHtml(label)}:</strong> ${val}`;
        }).join('<br>');
    }

    clear() { this.markerCluster?.clearLayers(); }
}

export default MarkerManager;
