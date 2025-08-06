import * as fs from "node:fs/promises";
import path from "node:path";
import { openDB } from "../helper/db.js";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import INTERESTED_YEAR_RANGE from "../config/year-range.json" with {
    type: "json",
};

const TIMER_LABEL = "Generating nodes and edges";
console.time(TIMER_LABEL);

const DB_PATH = path.join(import.meta.dirname, "../data/dblp.sqlite3");
const OUTPUT_DIR_PATH = path.join(import.meta.dirname, "../data");

const db = openDB(
    DB_PATH,
    // { verbose: console.log }
);

const _nodes = db.prepare(
    /* sql */ `    
    SELECT DISTINCT
        pp.person_id AS id,
        CASE
        ${
        INTERESTED_CONFERENCES.map(([label, match]) =>
            /* sql */ `WHEN publication.booktitle REGEXP '${match}' THEN '${label}'`
        ).join("\n")
    }
        END AS conference,
        person.name,
        person.orcid
    FROM
        publication,
        publication_person as pp,
        person
    WHERE
        publication.year >= ${INTERESTED_YEAR_RANGE[0]} AND
        publication.year <= ${INTERESTED_YEAR_RANGE[1]} AND
        publication.id = pp.publication_id AND
        pp.person_id = person.id AND
        (${
        INTERESTED_CONFERENCES.map(([_, match]) =>
            /* sql */ `publication.booktitle REGEXP '${match}'`
        ).join(" OR ")
    })
  `,
).all();

const _groupedNodes = Object.groupBy(
    _nodes,
    ({ id }) => id,
);

const nodes = Object.values(_groupedNodes).map((records) => (
    {
        id: records[0].id,
        name: records[0].name,
        orcid: records[0].orcid,
        conferences: records.map(({ conference }) => conference),
        priority: 0
    }
));

console.timeLog(TIMER_LABEL, "nodes generated");

const _edges = db.prepare(
    /* sql */ `    
    SELECT DISTINCT
        pp1.person_id AS source,
        pp2.person_id AS target,
        CASE
        ${
        INTERESTED_CONFERENCES.map(([label, match]) =>
            /* sql */ `WHEN publication.booktitle REGEXP '${match}' THEN '${label}'`
        ).join("\n")
    }
        END AS conference
    FROM
        publication,
        publication_person AS pp1,
        publication_person AS pp2
    WHERE
        publication.year >= ${INTERESTED_YEAR_RANGE[0]} AND
        publication.year <= ${INTERESTED_YEAR_RANGE[1]} AND
        publication.id = pp1.publication_id AND
        pp1.publication_id = pp2.publication_id AND
        pp1.person_id < pp2.person_id AND
        (${
        INTERESTED_CONFERENCES.map(([_, match]) =>
            /* sql */ `publication.booktitle REGEXP '${match}'`
        ).join(" OR ")
    })
  `,
).all();

const _groupedEdges = Object.groupBy(
    _edges,
    ({ source, target }) => `${source}_${target}`,
);

const edges = Object.values(_groupedEdges).map((records) => (
    {
        source: records[0].source,
        target: records[0].target,
        conferences: records.map(({ conference }) => conference),
        priority: -1,
        id: 0,
    }
));

let degree_map = new Map();
for (let i = 0; i < edges.length; i++) {
    let s = edges[i].source;
    let t = edges[i].target;

    if (degree_map.has(s)) {
        degree_map.set(s, degree_map.get(s) + 1)
    }
    else {
        degree_map.set(s, 1);
    }

    if (degree_map.has(t)) {
        degree_map.set(t, degree_map.get(t) + 1)
    }
    else {
        degree_map.set(t, 1);
    }

    edges[i].id =  2147483647 - i;
}

for (let i = 0; i < nodes.length; i++) {
    let node_id = nodes[i].id;
    let degree = degree_map.get(node_id);
    if (degree != undefined) {
        nodes[i].priority = degree;
    }
}

console.timeLog(TIMER_LABEL, "edges generated");

await fs.mkdir(path.dirname(OUTPUT_DIR_PATH), { recursive: true });
await fs.writeFile(
    path.join(OUTPUT_DIR_PATH, "nodes-and-edges.json"),
    JSON.stringify({ nodes, edges }),
);

console.timeEnd(TIMER_LABEL);
