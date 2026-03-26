require('dotenv').config();
const mysql = require('mysql2/promise');

// Database 1: App data (users, places, checkins, events, reviews, programs)
const appPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_APP_NAME || 'nakhonphanom_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Database 2: City data (traffic, pm25, weather, water, waste, electricity, ai_logs)
const cityPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_CITY_NAME || 'nakhonphanom_city',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Database 3: Smart Bin data (smart bins, collection history, alerts, statistics)
const smartbinPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_SMARTBIN_NAME || 'nakhonphanom_smartbin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = { appPool, cityPool, smartbinPool };

