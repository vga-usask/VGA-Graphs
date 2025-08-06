import * as fs from "node:fs/promises";
import path from "node:path";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import CONFERENCE_COLORS from "../config/colors.json" with { type: "json" };
import INTERESTED_YEAR_RANGE from "../config/year-range.json" with {
    type: "json",
};
import TIME_SERIES_MATADATA from "../data/time-series/metadata.json" with {
    type: "json",
};

import CONFERENCE_COMBOS from "../config/conference-combos.json" with {
    type: "json",
};

const TIMER_LABEL = "Generating the VGA config";
console.time(TIMER_LABEL);

const OUTPUT_PATH = path.join(
    import.meta.dirname,
    "../data/app.vgaconf.json",
);

const config = {
    fileBasePath: "",
    pageTitle: "DBLP",
    favicon: "https://dblp.org/img/favicon.ico",
    preferCanvas: false,
    view: {
        center: [
            0,
            0,
        ],
        zoom: 5,
    },
    imports: {
        "metadata": "./plugin/metadata.plugin.js",
        "tile-layer": "./plugin/tile-layer.plugin.js",
        "gl-layer": "./plugin/gl-layer.plugin.js",
        "heatmap": "./plugin/heatmap.plugin.js",
        "search": "./plugin/search.plugin.js",
    },
    plugins: [
        {
            import: "metadata",
            container: "sidebar",
            containerProps: {
                slot: "top",
            },
        },
        {
            import: "search",
            container: "sidebar",
            props: {
                nodesGeoJSONUrl: "./nodes.geojson",
                detailZoomLevel: 12,
            },
        },
        {
            import: "gl-layer",
            container: "main",
            props: {
                displayName: "DBLP",
                active: true,
                type: "base-layer",
                tileSource: "./tiles/{z}/{x}/{y}.pbf",
                tileMetadata: "./tiles/metadata.json",
                nodeColours: "./node-colours.json",
                conferences: INTERESTED_CONFERENCES.map(([label]) => label),
                conferenceColors: CONFERENCE_COLORS,
                conferenceCombos: CONFERENCE_COMBOS,
            },
        },
        {
            import: "heatmap",
            container: "sidebar",
            props: {
                conferences: INTERESTED_CONFERENCES.map(([label]) => label),
                years: Array.from({
                    length: INTERESTED_YEAR_RANGE[1] -
                        INTERESTED_YEAR_RANGE[0] + 1,
                }, (_, i) => INTERESTED_YEAR_RANGE[0] + i),
                minValue: TIME_SERIES_MATADATA.min,
                maxValue: TIME_SERIES_MATADATA.max,
            },
        },
    ],
};

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, JSON.stringify(config));

console.timeEnd(TIMER_LABEL);
