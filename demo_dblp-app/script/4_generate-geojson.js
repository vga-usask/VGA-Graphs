import path from "node:path";
import * as fs from "node:fs/promises";
import { max, min, scaleLinear } from "d3";
import NODES_LAYOUT from "../data/nodes-layout.json" with { type: "json" };
import NODES_AND_EDGES from "../data/nodes-and-edges.json" with {
    type: "json",
};
import FREQUENT_CONFERENCES from "../data/frequent-conference.json" with {
    type: "json",
};

const TIMER_LABEL = "Generating the GeoJSON";
console.time(TIMER_LABEL);

const GEOJSON_OUTPUT_PATH = path.join(
    import.meta.dirname,
    "../data/graph.geojson",
);
const NODES_GEOJSON_OUTPUT_PATH = path.join(
    import.meta.dirname,
    "../data/nodes.geojson",
);
const PADDING_RATIO_X = 0.75;
const PADDING_RATIO_Y = 0.75;

const minX = min(NODES_LAYOUT.map((d) => d.x));
const maxX = max(NODES_LAYOUT.map((d) => d.x));
const minY = min(NODES_LAYOUT.map((d) => d.y));
const maxY = max(NODES_LAYOUT.map((d) => d.y));
const scaleX = scaleLinear().range([
    -180 * (1 - PADDING_RATIO_X),
    180 * (1 - PADDING_RATIO_X),
]).domain([minX, maxX]);
const scaleY = scaleLinear().range([
    -90 * (1 - PADDING_RATIO_Y),
    90 * (1 - PADDING_RATIO_Y),
]).domain([minY, maxY]);
const geojsonObject = {
    type: "FeatureCollection",
    features: NODES_LAYOUT.map((node) => ({
        type: "Feature",
        id: node.id,
        geometry: {
            type: "Point",
            coordinates: [scaleX(node.x), scaleY(node.y)],
        },
        properties: {
            id: node.id,
            name: node.name,
            orcid: node.orcid,
            type: node.type,
            conferences: node.conferences,
            frequent: [FREQUENT_CONFERENCES[node.id]],
            priority: node.priority
        },
    })).concat(NODES_AND_EDGES.edges.map(({ source, target, conferences, priority, id }) => {
        const node1 = NODES_LAYOUT.find((n) => n.id === source);
        const node2 = NODES_LAYOUT.find((n) => n.id === target);
        return {
            type: "Feature",
            id: id,
            geometry: {
                type: "LineString",
                coordinates: [
                    [scaleX(node1.x), scaleY(node1.y)],
                    [scaleX(node2.x), scaleY(node2.y)],
                ],
            },
            properties: {
                source,
                target,
                conferences,
                priority: priority,
            },
        };
    })),
};
await fs.writeFile(GEOJSON_OUTPUT_PATH, JSON.stringify(geojsonObject));
await fs.writeFile(
    NODES_GEOJSON_OUTPUT_PATH,
    JSON.stringify({
        ...geojsonObject,
        features: geojsonObject.features.filter(({ geometry: { type } }) =>
            type === "Point"
        ),
    }),
);

console.timeEnd(TIMER_LABEL);
