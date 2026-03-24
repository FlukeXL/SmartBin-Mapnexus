const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = 17.3999;
const LON = 104.7846;

const { cityPool: pool } = require('../config/db');

// Helper to save PM2.5 to DB
const savePM25History = async (aqi, pm25, status) => {
    try {
        await pool.query(
            'INSERT INTO air_quality_history (aqi, pm25, status) VALUES (?, ?, ?)',
            [aqi, pm25, status]
        );
    } catch (e) { console.error('PM2.5 SQL Save Error:', e.message); }
};

// Get Real-time PM2.5 (Prioritizing AQICN for Nakhon Phanom Met Station)
router.get('/', async (req, res) => {
    try {
        const AQICN_TOKEN = process.env.AQICN_TOKEN || 'demo'; 
        const aqicnUrl = `https://api.waqi.info/feed/@H13630/?token=${AQICN_TOKEN}`;
        
        try {
            const aqicnRes = await axios.get(aqicnUrl, { timeout: 5000 });
            if (aqicnRes.data && aqicnRes.data.status === 'ok') {
                const data = aqicnRes.data.data;
                const aqi = data.aqi;
                const pm25 = data.iaqi.pm25 ? data.iaqi.pm25.v : data.aqi;
                
                let status = "Moderate";
                let color = "#FF9500";
                
                if (aqi <= 50) { status = "Good"; color = "#10b981"; }
                else if (aqi <= 100) { status = "Fair"; color = "#FFCE03"; }
                else if (aqi > 200) { status = "Very Poor"; color = "#AF2323"; }
                else if (aqi > 150) { status = "Poor"; color = "#FF3B30"; }

                // Save to SQL
                savePM25History(aqi, pm25, status);

                return res.json({
                    station: "สถานีอุตุนิยมวิทยานครพนม (AQICN)",
                    timestamp: new Date().toISOString(),
                    current: { aqi, pm25, status, color },
                    isReal: true
                });
            }
        } catch (e) { console.warn("AQICN Fetch failed, trying OWM..."); }

        // Fallback to OWM
        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            return res.json({
                station: "Demo Mode",
                current: { aqi: 28, pm25: 12.5, status: "Good", color: "#10b981" },
                isReal: false
            });
        }

        const currentUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${API_KEY}`;
        const currentRes = await axios.get(currentUrl);
        const currentData = currentRes.data.list[0];
        const aqiMap = {
            1: { status: "Good", color: "#10b981" },
            2: { status: "Fair", color: "#FFCE03" },
            3: { status: "Moderate", color: "#FF9500" },
            4: { status: "Poor", color: "#FF3B30" },
            5: { status: "Very Poor", color: "#AF2323" }
        };

        const currentAqi = currentData.main.aqi;
        const normalizedAqi = currentAqi * 20;

        // Save to SQL
        savePM25History(normalizedAqi, currentData.components.pm2_5, aqiMap[currentAqi].status);

        res.json({
            station: "Nakhon Phanom (OpenWeatherMap)",
            timestamp: new Date().toISOString(),
            current: {
                aqi: normalizedAqi,
                pm25: currentData.components.pm2_5,
                status: aqiMap[currentAqi].status,
                color: aqiMap[currentAqi].color
            },
            isReal: true
        });
    } catch (error) {
        // Graceful fallback when both APIs fail
        res.json({
            station: "Demo Mode (Offline)",
            current: { aqi: 28, pm25: 12.5, status: "Good", color: "#10b981" },
            isReal: false
        });
    }
});

// GET PM2.5 History for Sparklines
router.get('/history', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT pm25 as value, timestamp FROM air_quality_history ORDER BY timestamp DESC LIMIT 10'
        );
        res.json(rows.reverse());
    } catch (e) {
        // Fallback sparkline data (deterministic)
        const mock = [];
        for (let i = 9; i >= 0; i--) {
            // Use deterministic value based on the loop index to simulate trend
            mock.push({ value: 15 + ((i % 5) * 2), timestamp: new Date(Date.now() - i * 86400000) });
        }
        res.json(mock);
    }
});

module.exports = router;
