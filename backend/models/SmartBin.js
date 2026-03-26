const { smartbinPool: pool } = require('../config/db');

class SmartBin {
    static async getAll() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM smart_bins ORDER BY created_at DESC'
            );
            return rows;
        } catch (error) {
            console.error("Error fetching smart bins from MySQL:", error);
            return [];
        }
    }

    static async getActive() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM smart_bins WHERE status = "active" OR status = "full" ORDER BY fill_level DESC'
            );
            return rows;
        } catch (error) {
            console.error("Error fetching active smart bins:", error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM smart_bins WHERE id = ?',
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error("Error fetching smart bin by id:", error);
            return null;
        }
    }

    static async add(binData) {
        try {
            const [result] = await pool.query(
                'INSERT INTO smart_bins (name, location_name, lat, lng, bin_type, capacity, fill_level, status, temperature, battery_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    binData.name,
                    binData.location_name || '',
                    parseFloat(binData.lat),
                    parseFloat(binData.lng),
                    binData.bin_type || 'general',
                    binData.capacity || 100,
                    binData.fill_level || 0,
                    binData.status || 'active',
                    binData.temperature || null,
                    binData.battery_level || 100
                ]
            );
            return { id: result.insertId, ...binData };
        } catch (error) {
            console.error("Error adding smart bin to MySQL:", error);
            throw error;
        }
    }

    static async update(id, binData) {
        try {
            // ดึงข้อมูลเดิมก่อน
            const existingBin = await this.getById(id);
            if (!existingBin) {
                throw new Error('Smart bin not found');
            }

            // รองรับทั้ง latitude/longitude และ lat/lng
            const lat = binData.latitude || binData.lat || existingBin.lat;
            const lng = binData.longitude || binData.lng || existingBin.lng;

            // Merge ข้อมูลเดิมกับข้อมูลใหม่
            const updatedData = {
                name: binData.name || existingBin.name,
                location_name: binData.location_name || existingBin.location_name,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                bin_type: binData.bin_type || existingBin.bin_type,
                capacity: binData.capacity || existingBin.capacity,
                fill_level: binData.fill_level !== undefined ? binData.fill_level : existingBin.fill_level,
                status: binData.status || existingBin.status,
                temperature: binData.temperature !== undefined ? binData.temperature : existingBin.temperature,
                battery_level: binData.battery_level !== undefined ? binData.battery_level : existingBin.battery_level
            };

            await pool.query(
                'UPDATE smart_bins SET name = ?, location_name = ?, lat = ?, lng = ?, bin_type = ?, capacity = ?, fill_level = ?, status = ?, temperature = ?, battery_level = ? WHERE id = ?',
                [
                    updatedData.name,
                    updatedData.location_name,
                    updatedData.lat,
                    updatedData.lng,
                    updatedData.bin_type,
                    updatedData.capacity,
                    updatedData.fill_level,
                    updatedData.status,
                    updatedData.temperature,
                    updatedData.battery_level,
                    id
                ]
            );
            
            return { id, ...updatedData };
        } catch (error) {
            console.error("Error updating smart bin:", error);
            throw error;
        }
    }

    static async updateFillLevel(id, fillLevel) {
        try {
            const status = fillLevel >= 90 ? 'full' : 'active';
            await pool.query(
                'UPDATE smart_bins SET fill_level = ?, status = ? WHERE id = ?',
                [fillLevel, status, id]
            );
            return { id, fill_level: fillLevel, status };
        } catch (error) {
            console.error("Error updating fill level:", error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            await pool.query('DELETE FROM smart_bins WHERE id = ?', [id]);
            return { success: true };
        } catch (error) {
            console.error("Error deleting smart bin:", error);
            throw error;
        }
    }

    // ดึงถังขยะที่ต้องเก็บด่วน
    static async getNeedCollection() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM bins_need_collection'
            );
            return rows;
        } catch (error) {
            console.error("Error fetching bins need collection:", error);
            return [];
        }
    }

    // ดึงสถิติรวม
    static async getSummary() {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM bins_summary'
            );
            return rows[0] || null;
        } catch (error) {
            console.error("Error fetching bins summary:", error);
            return null;
        }
    }
}

module.exports = SmartBin;
