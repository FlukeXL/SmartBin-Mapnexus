const { appPool: pool } = require('../config/db');

class MapMockup {
    static async getActive() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM map_mockups WHERE is_active = 1 ORDER BY display_order ASC LIMIT 1'
            );
            
            if (rows.length > 0) {
                const mockup = rows[0];
                // Parse JSON features
                if (mockup.features && typeof mockup.features === 'string') {
                    try {
                        mockup.features = JSON.parse(mockup.features);
                    } catch (e) {
                        mockup.features = [];
                    }
                }
                return mockup;
            }
            return null;
        } catch (error) {
            console.error("Error fetching map mockup from MySQL:", error);
            return null;
        }
    }

    static async getAll() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM map_mockups ORDER BY display_order ASC'
            );
            
            return rows.map(mockup => {
                if (mockup.features && typeof mockup.features === 'string') {
                    try {
                        mockup.features = JSON.parse(mockup.features);
                    } catch (e) {
                        mockup.features = [];
                    }
                }
                return mockup;
            });
        } catch (error) {
            console.error("Error fetching all map mockups from MySQL:", error);
            return [];
        }
    }

    static async add(mockupData) {
        try {
            const features = typeof mockupData.features === 'string' 
                ? mockupData.features 
                : JSON.stringify(mockupData.features);

            const [result] = await pool.query(
                'INSERT INTO map_mockups (title, description, icon, features, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    mockupData.title,
                    mockupData.description || '',
                    mockupData.icon || 'fa-map-location-dot',
                    features,
                    mockupData.is_active !== undefined ? mockupData.is_active : 1,
                    mockupData.display_order || 0
                ]
            );
            return { id: result.insertId, ...mockupData };
        } catch (error) {
            console.error("Error adding map mockup to MySQL:", error);
            throw error;
        }
    }

    static async update(id, mockupData) {
        try {
            const features = typeof mockupData.features === 'string' 
                ? mockupData.features 
                : JSON.stringify(mockupData.features);

            await pool.query(
                'UPDATE map_mockups SET title = ?, description = ?, icon = ?, features = ?, is_active = ?, display_order = ? WHERE id = ?',
                [
                    mockupData.title,
                    mockupData.description,
                    mockupData.icon,
                    features,
                    mockupData.is_active,
                    mockupData.display_order,
                    id
                ]
            );
            return { id, ...mockupData };
        } catch (error) {
            console.error("Error updating map mockup:", error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            await pool.query('DELETE FROM map_mockups WHERE id = ?', [id]);
            return { success: true };
        } catch (error) {
            console.error("Error deleting map mockup:", error);
            throw error;
        }
    }
}

module.exports = MapMockup;
