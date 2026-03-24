const pool = require('../backend/config/db');

async function createWeatherTable() {
    const conn = await pool.getConnection();
    try {
        console.log('--- Database: Checking/Creating weather_history table ---');
        const sql = `
            CREATE TABLE IF NOT EXISTS weather_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                area_id VARCHAR(50) NOT NULL,
                area_name VARCHAR(100) NOT NULL,
                temp FLOAT,
                humidity FLOAT,
                wind_speed FLOAT,
                description VARCHAR(255),
                icon VARCHAR(20),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (area_id),
                INDEX (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await conn.query(sql);
        console.log('SUCCESS: Table weather_history is ready.');
    } catch (err) {
        console.error('ERROR creating table:', err);
    } finally {
        conn.release();
        process.exit();
    }
}

createWeatherTable();
