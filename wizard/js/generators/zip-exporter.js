/**
 * zip-exporter.js — Generates a downloadable ZIP containing the complete WebGIS app.
 *
 * Fetches all app files from the hosted /app/ directory and bundles them
 * with the user's generated config into a ready-to-deploy ZIP.
 */

// File paths relative to /app/ that make up the WebGIS runtime
const APP_FILES = [
    'index.html',
    'styles.css',
    'js/main.js',
    'js/ConfigLoader.js',
    'js/core/CacheManager.js',
    'js/core/EventBus.js',
    'js/core/StateManager.js',
    'js/data/DataManager.js',
    'js/data/StatsManager.js',
    'js/map/MapManager.js',
    'js/map/MarkerManager.js',
    'js/map/MeasurementTool.js',
    'js/ui/FilterDisplay.js',
    'js/ui/FilterManager.js',
    'js/ui/GlobalSearch.js',
    'js/ui/MobileControls.js',
    'js/ui/ModalManager.js',
    'js/ui/QueryBuilder.js',
    'js/ui/StatusBar.js',
    'js/ui/UIController.js',
    'js/utils/DropdownLimiter.js',
    'js/utils/EmailHelper.js',
    'js/utils/helpers.js'
];

/**
 * Build and download a ZIP containing the full WebGIS app + config.
 * @param {object} config - The generated webgis.config.json content
 * @param {string} projectTitle - Used for the ZIP filename
 */
export async function downloadZip(config, projectTitle) {
    const zip = new JSZip();

    // Fetch all app template files from the hosted /app/ directory
    const appBase = new URL('../app/', window.location.href).href;
    const results = await Promise.allSettled(
        APP_FILES.map(async (path) => {
            const resp = await fetch(`${appBase}${path}`);
            if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
            return { path, content: await resp.text() };
        })
    );

    for (const result of results) {
        if (result.status === 'fulfilled') {
            zip.file(result.value.path, result.value.content);
        } else {
            console.warn('Failed to fetch file:', result.reason);
        }
    }

    // Add the generated config
    zip.file('webgis.config.json', JSON.stringify(config, null, 4));

    // Add .nojekyll for GitHub Pages
    zip.file('.nojekyll', '');

    // Generate and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const safeName = (projectTitle || 'WebGIS').replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
}
