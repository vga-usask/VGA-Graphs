import path from "node:path";
import * as fs from "node:fs/promises";
import {
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
} from "d3";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import NODES_AND_EDGES from "../data/nodes-and-edges.json" with {
    type: "json",
};

const TIMER_LABEL = "Generating the force layout";
console.time(TIMER_LABEL);

const OUTPUT_PATH = path.join(
    import.meta.dirname,
    "../data/nodes-layout.json",
);
const MAX_ITERATION_COUNT = 10_000;

const personNodes = NODES_AND_EDGES.nodes.map((node) => ({
    ...node,
    type: "person",
}));
const conferenceNodes = INTERESTED_CONFERENCES.map(([label]) => ({
    id: label,
    type: "conference",
}));
const conferencePersonLinks = NODES_AND_EDGES.nodes.flatMap((node) =>
    node.conferences.map((conference) => ({
        source: conference,
        target: node.id,
    }))
);
let iterationCount = 0;
const simulation = forceSimulation()
    .nodes(personNodes.concat(conferenceNodes))
    .force(
        "person-person",
        forceLink(NODES_AND_EDGES.edges.concat(conferencePersonLinks)).id((d) =>
            d.id
        ).strength(1),
    )
    .force("charge", forceManyBody())
    .force("collide", forceCollide())
    .force("x", forceX())
    .force("y", forceY());
simulation.on("tick", () => {
    if (iterationCount++ >= MAX_ITERATION_COUNT) {
        simulation.stop();
    }
});
simulation.on("end", async () => {
    const nodes = simulation.nodes();
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(nodes));
});

console.timeEnd(TIMER_LABEL);
