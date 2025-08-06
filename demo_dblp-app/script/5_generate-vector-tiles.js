import { spawnSync } from "node:child_process";
import * as fs from "node:fs/promises";
import path from "node:path";

const TIMER_LABEL = "Generating the vector tiles";
console.time(TIMER_LABEL);

const INPUT_PATH = path.join(import.meta.dirname, "../data/graph.geojson");
const OUTPUT_TILES_DIR_PATH = path.join(import.meta.dirname, "../data/tiles");

const MAXIMUM_ZOOM = null;
const EXTEND_ZOOMS_IF_STILL_DROPPING = false;
const MAXIMUM_TILE_BYTES = 5_000_000;
const MAXIMUM_TILE_FEATURES = 50_000;

const options = [
    "--no-tile-compression",
    // "--drop-densest-as-needed",
    // "--coalesce-densest-as-needed",
    // "--read-parallel",
    // "--leave-lines",
    //"--cluster-distance=20",
    // "--aggregate-cluster",
    "--keep-point-cluster-position",
    "--layer=dblp",
    "--base-zoom=0",
];

for (let i = 2; i < process.argv.length; i++) {
    options.push(process.argv[i]);
    console.log("added option" + process.argv[i]);
} 

options.push(MAXIMUM_ZOOM ? `-z${MAXIMUM_ZOOM}` : "-z4");
if (EXTEND_ZOOMS_IF_STILL_DROPPING) {
    options.push("--extend-zooms-if-still-dropping");
}
options.push(
    !MAXIMUM_TILE_BYTES
        ? "--no-tile-size-limit"
        : `--maximum-tile-bytes=${MAXIMUM_TILE_BYTES}`,
);
options.push(
    !MAXIMUM_TILE_FEATURES
        ? "--no-feature-limit"
        : `--maximum-tile-features=${MAXIMUM_TILE_FEATURES}`,
);

try {
    await fs.rm(OUTPUT_TILES_DIR_PATH, { recursive: true });
} catch {}
await fs.mkdir(OUTPUT_TILES_DIR_PATH, { recursive: true });

spawnSync("tippecanoe", ["-e", OUTPUT_TILES_DIR_PATH, ...options, INPUT_PATH], {
    stdio: "inherit",
});

console.timeEnd(TIMER_LABEL);
