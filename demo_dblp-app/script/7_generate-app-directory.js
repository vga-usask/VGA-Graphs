import * as fs from "node:fs/promises";
import path from "node:path";

const TIMER_LABEL = "Generating the app directory";
console.time(TIMER_LABEL);

const OUTPUT_DIR_PATH = path.join(
    import.meta.dirname,
    "../dist",
);

try {
    await fs.rm(OUTPUT_DIR_PATH, { recursive: true });
} catch {}
await fs.mkdir(OUTPUT_DIR_PATH, { recursive: true });

await fs.cp(
    path.join(import.meta.dirname, "../data/tiles"),
    path.join(OUTPUT_DIR_PATH, "./tiles"),
    {
        recursive: true,
    },
);
console.timeLog(TIMER_LABEL, `tiles copied`);


await fs.cp(
    path.join(import.meta.dirname, "../data/time-series"),
    path.join(OUTPUT_DIR_PATH, "./time-series"),
    {
        recursive: true,
    },
);
console.timeLog(TIMER_LABEL, `time-series copied`);

await fs.cp(
    path.join(import.meta.dirname, "../plugin"),
    path.join(OUTPUT_DIR_PATH, "./plugin"),
    {
        recursive: true,
    },
);
console.timeLog(TIMER_LABEL, `plugins copied`);

await fs.cp(
    path.join(import.meta.dirname, "../data/nodes.geojson"),
    path.join(OUTPUT_DIR_PATH, "./nodes.geojson"),
);
console.timeLog(TIMER_LABEL, `nodes mapping copied`);

await fs.cp(
    path.join(import.meta.dirname, "../data/app.vgaconf.json"),
    path.join(OUTPUT_DIR_PATH, "./app.vgaconf.json"),
);
console.timeLog(TIMER_LABEL, `VGA config copied`);

console.timeEnd(TIMER_LABEL);
