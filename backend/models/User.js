const { appPool: pool } = require('../config/db');

class User {
    static async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(userData) {
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, is_premium) VALUES (?, ?, ?, 0)',
            [userData.username, userData.email, userData.password]
        );
        return { id: result.insertId, ...userData, is_premium: 0 };
    }

    static async updateXP(userId, xpToAdd) {
        const [result] = await pool.query(
            'UPDATE users SET xp = xp + ?, level = FLOOR((xp + ?) / 1000) + 1 WHERE id = ?',
            [xpToAdd, xpToAdd, userId]
        );
        return result;
    }

    static async upgradeToPremium(userId) {
        const [result] = await pool.query(
            'UPDATE users SET is_premium = 1 WHERE id = ?',
            [userId]
        );
        return result;
    }
}

module.exports = User;
