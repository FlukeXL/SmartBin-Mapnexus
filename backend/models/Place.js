const { appPool: pool } = require('../config/db');

class Place {
    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT * FROM places ORDER BY created_at DESC');
            return rows;
        } catch (error) {
            console.error("Error fetching places from MySQL:", error);
            // Fallback during setup or if table doesn't exist
            return [];
        }
    }

    static async add(placeData) {
        try {
            const [result] = await pool.query(
                'INSERT INTO places (name, type, lat, lng, description, image) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    placeData.name,
                    placeData.type,
                    parseFloat(placeData.lat),
                    parseFloat(placeData.lng),
                    placeData.description || '',
                    placeData.image || ''
                ]
            );
            return { id: result.insertId, ...placeData };
        } catch (error) {
            console.error("Error adding place to MySQL:", error);
            throw error;
        }
    }
}

module.exports = Place;
