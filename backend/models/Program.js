const { appPool: pool } = require('../config/db');

class Program {
    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT * FROM programs ORDER BY id ASC');
            return rows;
        } catch (error) {
            console.error("Error fetching programs:", error);
            return [];
        }
    }
}

module.exports = Program;
