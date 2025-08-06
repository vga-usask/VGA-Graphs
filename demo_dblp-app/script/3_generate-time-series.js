import * as fs from "node:fs/promises";
import path from "node:path";
import { openDB } from "../helper/db.js";
import { csvFormatBody, max } from "d3";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import INTERESTED_YEAR_RANGE from "../config/year-range.json" with {
    type: "json",
};
import NODES_AND_EDGES from "../data/nodes-and-edges.json" with {
    type: "json",
};
/* ADDED COLOURS IMPORT */
import CONFERENCE_COLOURS  from "../config/colors.json" with {
    type: "json",
};


const TIMER_LABEL = "Generating the time-series";
console.time(TIMER_LABEL);

const OUTPUT_DIR_PATH = path.join(
    import.meta.dirname,
    "../data/time-series",
);
const DB_PATH = path.join(
    import.meta.dirname,
    "../data/dblp.sqlite3",
);

/* Added new json output */
const FREQ_JSON_OUTPUT_PATH = path.join(
    import.meta.dirname,
    "../data/frequent-conference.json",
)

const db = openDB(
    DB_PATH,
    // { verbose: console.log }
);

try {
    await fs.rm(OUTPUT_DIR_PATH, { recursive: true });
} catch {}
await fs.mkdir(OUTPUT_DIR_PATH, { recursive: true });

const years = Array.from({
    length: INTERESTED_YEAR_RANGE[1] - INTERESTED_YEAR_RANGE[0] + 1,
}, (_, i) => INTERESTED_YEAR_RANGE[0] + i);

const queryResult = db.prepare(
    /* sql */ `
    SELECT DISTINCT
        publication_person.person_id AS person,
        CASE
            ${
        INTERESTED_CONFERENCES.map(([label, match]) =>
            /* sql */ `WHEN publication.booktitle REGEXP '${match}' THEN '${label}'`
        ).join("\n")
    }
        END AS conference,
        publication.year AS year,
        COUNT(publication.id) AS count
    FROM
        publication,
        publication_person
    WHERE
        (${
        INTERESTED_CONFERENCES.map(([_, match]) =>
            /* sql */ `publication.booktitle REGEXP '${match}'`
        ).join(" OR ")
    }) AND
        publication.id = publication_person.publication_id AND
        (publication.year BETWEEN ${INTERESTED_YEAR_RANGE[0]} AND ${
        INTERESTED_YEAR_RANGE[1]
    })
    GROUP BY
        person,
        conference,
        year
    ORDER BY
        person,
        conference,
        year
    `,
).all();

const allValues = queryResult.map((d) => d.count);
const metadata = { min: 0, max: max(allValues) };
await fs.writeFile(
    path.join(OUTPUT_DIR_PATH, `metadata.json`),
    JSON.stringify(metadata),
);

const groupedByPerson = Object.groupBy(queryResult, ({ person }) => person);

let frequentConferences = {};

NODES_AND_EDGES.nodes.forEach(async (node) => {
    const personId = node.id;
    const recordsForPerson = groupedByPerson[personId];
    const groupedByConference = Object.groupBy(
        recordsForPerson,
        ({ conference }) => conference,
    );
    
    /* Compute totals per conference for colouring of nodes */
    let stringCombo = ''
    let totals = {}
    for (let conf in groupedByConference) {
        let count = 0;
        for (let i = 0; i < groupedByConference[conf].length; i++) {
            count += groupedByConference[conf][i].count;
        };
        totals[conf] = count;
        if (count != 0) {
            if (stringCombo.length != 0) {
                stringCombo += " + ";
            }
            stringCombo += conf;
        }
    }

    
    frequentConferences[personId] = stringCombo;
    

    const result = INTERESTED_CONFERENCES.map(([label]) => {
        const recordsForConference = groupedByConference[label];
        const groupedByYear = recordsForConference
            ? Object.groupBy(
                recordsForConference,
                ({ year }) => year,
            )
            : {};
        return years.map((year) => groupedByYear[year]?.[0]?.count ?? 0);
    });
    await fs.writeFile(
        path.join(OUTPUT_DIR_PATH, `${node.id}.csv`),
        csvFormatBody(result),
    );
});

await fs.writeFile(
    FREQ_JSON_OUTPUT_PATH,
    JSON.stringify(frequentConferences)
);

console.timeEnd(TIMER_LABEL);
