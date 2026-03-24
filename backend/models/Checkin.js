const { appPool: pool } = require('../config/db');

class Checkin {
    static async create(checkinData) {
        const [result] = await pool.query(
            'INSERT INTO checkins (user_id, place_id, xp_earned) VALUES (?, ?, ?)',
            [checkinData.userId, checkinData.placeId, checkinData.xpEarned]
        );
        return { id: result.insertId, ...checkinData };
    }

    static async getByUser(userId) {
        const [rows] = await pool.query(
            'SELECT c.*, p.name as place_name FROM checkins c JOIN places p ON c.place_id = p.id WHERE c.user_id = ? ORDER BY c.timestamp DESC',
            [userId]
        );
        return rows;
    }
}

module.exports = Checkin;
