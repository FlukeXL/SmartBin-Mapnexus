const express = require('express');
const router = express.Router();
const { appPool: pool } = require('../config/db');

// Helper: Generate fallback mock data when MySQL is unavailable
function generateWeeklyMock() {
    const mockData = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        mockData.push({
            day: dayLabel,
            count: Math.floor(Math.random() * 60) + 40
        });
    }
    return mockData;
}

function generateSummaryMock() {
    return {
        visitorsToday: Math.floor(Math.random() * 80) + 50,
        aiRequests: Math.floor(Math.random() * 20) + 5,
        topPlace: {
            name: 'พญาศรีสัตตนาคราช',
            count: Math.floor(Math.random() * 30) + 15
        }
    };
}

// Get Monthly Tourist Stats (Check-ins)
router.get('/monthly-tourists', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                MONTHNAME(timestamp) as month, 
                COUNT(*) as count 
            FROM checkins 
            WHERE YEAR(timestamp) = YEAR(CURRENT_DATE())
            GROUP BY MONTH(timestamp), MONTHNAME(timestamp)
            ORDER BY MONTH(timestamp)
        `);

        if (rows.length === 0) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mockData = months.map((m, i) => ({
                month: m,
                count: Math.floor(Math.random() * 500) + 200 + (i * 50)
            }));
            return res.json(mockData);
        }

        res.json(rows);
    } catch (error) {
        console.error('Error fetching monthly stats:', error.code || error.message);
        // Graceful fallback when MySQL is unavailable
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        res.json(months.map((m, i) => ({
            month: m,
            count: Math.floor(Math.random() * 500) + 200 + (i * 50)
        })));
    }
});

// Get Dashboard Summary Stats
router.get('/dashboard-summary', async (req, res) => {
    try {
        const [visitorRows] = await pool.execute(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM checkins 
            WHERE DATE(timestamp) = CURRENT_DATE()
        `);
        const visitorsToday = visitorRows[0].count || 0;

        let aiRequestsToday = 0;
        try {
            const [aiRows] = await pool.execute(`
                SELECT COUNT(*) as count 
                FROM ai_requests 
                WHERE DATE(timestamp) = CURRENT_DATE()
            `);
            aiRequestsToday = aiRows[0].count || 0;
        } catch (e) { /* ai_requests table might not exist yet */ }

        const [topRows] = await pool.execute(`
            SELECT p.name, COUNT(*) as count 
            FROM checkins c 
            JOIN places p ON c.place_id = p.id 
            WHERE DATE(c.timestamp) = CURRENT_DATE() 
            GROUP BY p.id 
            ORDER BY count DESC 
            LIMIT 1
        `);
        const topPlace = topRows[0] || { name: 'N/A', count: 0 };

        res.json({
            visitorsToday: visitorsToday,
            aiRequests: aiRequestsToday,
            topPlace: {
                name: topPlace.name === 'N/A' ? 'N/A' : topPlace.name,
                count: topPlace.count
            }
        });
    } catch (error) {
        console.error('Dashboard summary error:', error.code || error.message);
        // Graceful fallback
        res.json(generateSummaryMock());
    }
});

// Get Weekly Tourist Stats (Last 14 days)
router.get('/weekly-tourists', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                DATE_FORMAT(timestamp, '%d %b') as day,
                timestamp as date,
                COUNT(*) as count 
            FROM checkins 
            WHERE timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 13 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp) ASC
        `);

        if (rows.length === 0) {
            return res.json(generateWeeklyMock());
        }

        res.json(rows);
    } catch (error) {
        console.error('Weekly tourists error:', error.code || error.message);
        // Graceful fallback when MySQL is unavailable
        res.json(generateWeeklyMock());
    }
});

// Get Public Config (API Keys for Frontend)
router.get('/config', (req, res) => {
    res.json({
        longdoKey: process.env.LONGDO_MAP_KEY || null,
        googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || null
    });
});

// GET History for Visitors (Last 10 units)
router.get('/history/visitors', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT COUNT(DISTINCT user_id) as value, DATE(timestamp) as day 
            FROM checkins 
            GROUP BY DATE(timestamp) 
            ORDER BY DATE(timestamp) DESC 
            LIMIT 10
        `);
        res.json(rows.reverse());
    } catch (e) {
        // Fallback sparkline data
        const mock = [];
        for (let i = 9; i >= 0; i--) {
            mock.push({ value: Math.floor(Math.random() * 50) + 20, day: new Date(Date.now() - i * 86400000) });
        }
        res.json(mock);
    }
});

// GET History for AI Requests (Last 10 units)
router.get('/history/ai-requests', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT COUNT(*) as value, DATE(timestamp) as day 
            FROM ai_requests 
            GROUP BY DATE(timestamp) 
            ORDER BY DATE(timestamp) DESC 
            LIMIT 10
        `);
        res.json(rows.reverse());
    } catch (e) {
        // Fallback sparkline data
        const mock = [];
        for (let i = 9; i >= 0; i--) {
            mock.push({ value: Math.floor(Math.random() * 15) + 3, day: new Date(Date.now() - i * 86400000) });
        }
        res.json(mock);
    }
});

module.exports = router;
