# WebGIS

A config-driven platform for building interactive WebGIS sites — no coding required. Upload a CSV, walk through the setup wizard, and deploy a full-featured geographic database viewer backed by Supabase.

## Quick Start

1. Open `wizard/index.html` in a browser.
2. Upload your CSV file.
3. Walk through the 7 steps (columns → filters → display → map → project info).
4. Export three files: `webgis.config.json`, `setup.sql`, `data.sql`.
5. Create a **Supabase** project, run both SQL files in the SQL Editor.
6. Paste your Supabase URL and anon key into `webgis.config.json`.
7. Drop the `app/` folder + config into a GitHub repo and enable GitHub Pages.

Your WebGIS site is live.

## Structure

```
WebGIS/
├── app/                    # The runtime application
│   ├── index.html          # App shell
│   ├── styles.css          # Stylesheet
│   ├── webgis.config.example.json
│   ├── examples/           # Sample configs
│   │   ├── beachrocks.config.json
│   │   └── tombolos.config.json
│   └── js/
│       ├── main.js         # Entry point
│       ├── ConfigLoader.js # Reads & validates config
│       ├── core/           # EventBus, StateManager, CacheManager
│       ├── data/           # DataManager, StatsManager
│       ├── map/            # MapManager, MarkerManager, MeasurementTool
│       ├── ui/             # Filters, Modals, Search, StatusBar, etc.
│       └── utils/          # helpers, EmailHelper, DropdownLimiter
└── wizard/                 # Setup wizard (runs locally)
    ├── index.html
    ├── wizard-styles.css
    └── js/
        ├── wizard-main.js
        ├── steps/          # CSV parser, column/filter/display config
        └── generators/     # Config, SQL, Data generators
```

## Config Reference

The entire app reads from a single `webgis.config.json`. Key sections:

| Section | Purpose |
|---------|---------|
| `project` | Title, subtitle, unit name, contact email |
| `supabase` | URL and anon key |
| `database` | Table name, primary key, lat/lng columns, column definitions |
| `filters` | Array of sidebar filter dropdowns |
| `tooltip` | Fields shown on marker hover |
| `detailModal` | Fields shown in the detail modal on click |
| `statistics` | Computed stats in the sidebar (count, unique, avg, etc.) |
| `map` | Center, zoom, marker color, base layers |
| `search` | Columns searched by the global search bar |
| `features` | Toggle measurement tool, query builder, email features |

See `app/webgis.config.example.json` for a complete example.

## Tech Stack

- **Frontend**: Vanilla ES6 modules, Leaflet 1.9.4, Leaflet.markercluster
- **Backend**: Supabase (PostgreSQL + auto-generated REST API)
- **Hosting**: GitHub Pages (or any static host)
- **No build step** — just static files and a JSON config.
