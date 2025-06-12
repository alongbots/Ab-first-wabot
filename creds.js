const initDB = require('./db');

async function useSQLAuthState() {
    const { Cred } = await initDB();

    async function readData() {
        const creds = await Cred.findAll();
        return creds.reduce((acc, { key, value }) => {
            acc[key] = JSON.parse(value);
            return acc;
        }, {});
    }

    async function writeData(data) {
        const ops = Object.entries(data).map(([key, val]) =>
            Cred.upsert({ key, value: JSON.stringify(val) })
        );
        await Promise.all(ops);
    }

    const creds = await readData();
    const saveCreds = () => writeData(creds);

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const keys = await readData();
                    return ids.reduce((obj, id) => {
                        const key = `${type}-${id}`;
                        if (keys[key]) obj[id] = keys[key];
                        return obj;
                    }, {});
                },
                set: async (data) => {
                    for (const [category, entries] of Object.entries(data)) {
                        for (const [id, value] of Object.entries(entries)) {
                            creds[`${category}-${id}`] = value;
                        }
                    }
                    await saveCreds();
                }
            }
        },
        saveCreds
    };
}

module.exports = useSQLAuthState;
