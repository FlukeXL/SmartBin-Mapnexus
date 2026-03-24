const { appPool: pool } = require('../config/db');

class Review {
    static async getByPlaceId(placeId) {
        try {
            const [rows] = await pool.query(
                `SELECT r.*, u.username, u.is_premium 
                 FROM reviews r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.place_id = ? 
                 ORDER BY r.created_at DESC`,
                [placeId]
            );
            return rows;
        } catch (error) {
            console.error("Error fetching reviews:", error);
            return [];
        }
    }

    static async add(reviewData) {
        try {
            const [result] = await pool.query(
                'INSERT INTO reviews (place_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
                [reviewData.place_id, reviewData.user_id, reviewData.rating, reviewData.comment]
            );
            return { id: result.insertId, ...reviewData };
        } catch (error) {
            console.error("Error adding review:", error);
            throw error;
        }
    }
}

module.exports = Review;
