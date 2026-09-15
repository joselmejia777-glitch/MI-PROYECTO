const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'consultorio_saludpro',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 2
});

module.exports = pool.promise();