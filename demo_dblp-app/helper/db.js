import Database from "better-sqlite3";

export function openDB(path, options) {
    const db = new Database(
        path,
        options,
    );
    db.function("regexp", { deterministic: true }, (regex, text) => {
        return new RegExp(regex).test(text) ? 1 : 0;
    });
    return db;
}
