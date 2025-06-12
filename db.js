const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/baileysbot', {
    logging: false,
});

const Cred = sequelize.define('Cred', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.TEXT('long') }
}, { tableName: 'credentials', timestamps: false });

async function initDB() {
    await sequelize.sync();
    return { sequelize, Cred };
}

module.exports = initDB;
