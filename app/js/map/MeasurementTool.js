/**
 * MeasurementTool - Distance & area measurement on Leaflet map.
 */

class MeasurementTool {
    constructor(map) {
        this.map = map;
        this.active = false;
        this.points = [];
        this.lines = [];
        this.labels = [];
        this.polygon = null;
        this.totalDistance = 0;
    }

    toggle() {
        this.active ? this.deactivate() : this.activate();
    }

    activate() {
        this.active = true;
        this.clear();
        this.map.getContainer().style.cursor = 'crosshair';
        this.map.on('click', this.onClick, this);
        this.map.on('contextmenu', this.onRightClick, this);
    }

    deactivate() {
        this.active = false;
        this.map.getContainer().style.cursor = '';
        this.map.off('click', this.onClick, this);
        this.map.off('contextmenu', this.onRightClick, this);
    }

    onClick(e) {
        this.points.push(e.latlng);
        L.circleMarker(e.latlng, { radius: 4, color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 1, weight: 1 }).addTo(this.map);

        if (this.points.length > 1) {
            const prev = this.points[this.points.length - 2];
            const curr = e.latlng;
            const seg = prev.distanceTo(curr);
            this.totalDistance += seg;

            const line = L.polyline([prev, curr], { color: '#e74c3c', weight: 2, dashArray: '6,4' }).addTo(this.map);
            this.lines.push(line);

            const mid = L.latLng((prev.lat + curr.lat) / 2, (prev.lng + curr.lng) / 2);
            const label = L.tooltip({ permanent: true, direction: 'center', className: 'measurement-label' })
                .setLatLng(mid)
                .setContent(this.formatDistance(seg))
                .addTo(this.map);
            this.labels.push(label);
        }
    }

    onRightClick(e) {
        e.originalEvent.preventDefault();
        if (this.points.length >= 3) {
            this.polygon = L.polygon(this.points, { color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.15, weight: 2 }).addTo(this.map);
            const area = this.computeArea(this.points);
            const center = this.polygon.getBounds().getCenter();
            const label = L.tooltip({ permanent: true, direction: 'center', className: 'measurement-label measurement-area' })
                .setLatLng(center)
                .setContent(this.formatArea(area))
                .addTo(this.map);
            this.labels.push(label);
        }
        this.deactivate();
    }

    computeArea(latlngs) {
        // Shoelace approximation in m²
        const R = 6371000;
        let area = 0;
        const n = latlngs.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const xi = latlngs[i].lng * Math.PI / 180;
            const yi = latlngs[i].lat * Math.PI / 180;
            const xj = latlngs[j].lng * Math.PI / 180;
            const yj = latlngs[j].lat * Math.PI / 180;
            area += xi * Math.sin(yj) - xj * Math.sin(yi);
        }
        return Math.abs(area * R * R / 2);
    }

    formatDistance(m) {
        return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : m.toFixed(1) + ' m';
    }

    formatArea(m2) {
        if (m2 >= 1e6) return (m2 / 1e6).toFixed(3) + ' km²';
        return m2.toFixed(1) + ' m²';
    }

    clear() {
        this.lines.forEach(l => this.map.removeLayer(l));
        this.labels.forEach(l => this.map.removeLayer(l));
        if (this.polygon) this.map.removeLayer(this.polygon);
        this.points = []; this.lines = []; this.labels = []; this.polygon = null; this.totalDistance = 0;
    }
}

export default MeasurementTool;
