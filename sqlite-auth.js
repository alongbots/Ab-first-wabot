const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'auth.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS creds (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
)
`);

const CREDS_ID = 'session';

function useSQLiteAuthState() {
    const credsRow = db.prepare('SELECT data FROM creds WHERE id = ?').get(CREDS_ID);
    let state = credsRow ? JSON.parse(credsRow.data) : {};

    async function saveCreds(updated) {
        const merged = { ...state, ...updated };
        state = merged;
        db.prepare('INSERT OR REPLACE INTO creds (id, data) VALUES (?, ?)')
            .run(CREDS_ID, JSON.stringify(merged));
    }

    return {
        state,
        saveCreds
    };
}

module.exports = { useSQLiteAuthState };
