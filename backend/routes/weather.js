const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const API_KEY = process.env.OPENWEATHER_API_KEY;

const AREAS = [
    { id: "area_01", name: "ลานพญาศรีสัตตนาคราช", lat: 17.4116, lon: 104.7847, icon_base: "fa-dragon", type: "Landmark" },
    { id: "area_02", name: "หอนาฬิกาเวียดนามอนุสรณ์", lat: 17.4035, lon: 104.7845, icon_base: "fa-clock", type: "Old Town" },
    { id: "area_03", name: "ถนนคนเดินนครพนม", lat: 17.4080, lon: 104.7810, icon_base: "fa-person-walking", type: "City Center" },
    { id: "area_04", name: "อ่างเก็บน้ำหนองญาติ", lat: 17.3820, lon: 104.7450, icon_base: "fa-water", type: "Nature" },
    { id: "area_05", name: "สะพานมิตรภาพ 3", lat: 17.4851, lon: 104.7431, icon_base: "fa-bridge", type: "Border" },
    { id: "area_06", name: "วัดพระธาตุพนม", lat: 16.9444, lon: 104.7247, icon_base: "fa-temple-buddhist", type: "Cultural" }
];

// Helper to generate mock data if API fails
const getMockData = (area) => ({
    ...area,
    temp: 28 + Math.random() * 7,
    humidity: 45 + Math.random() * 15,
    wind_speed: 1.5 + Math.random() * 3,
    description: "ท้องฟ้าแจ่มใส (จำลอง)",
    icon: "01d",
    condition: "Clear",
    isReal: false
});

// Get Current Weather (Global/General)
router.get('/', async (req, res) => {
    try {
        const LAT = 17.3996;
        const LON = 104.7696;
        
        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            return res.json({
                location: "Nakhon Phanom (Demo)",
                temp: 32.5,
                condition: "Clear Sky",
                description: "ท้องฟ้าแจ่มใส",
                icon: "01d",
                humidity: 45,
                wind_speed: 3.2,
                isReal: false
            });
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=th`;
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        res.json({
            location: data.name,
            temp: data.main.temp,
            condition: data.weather[0].main,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            humidity: data.main.humidity,
            wind_speed: data.wind.speed,
            pressure: data.main.pressure,
            visibility: data.visibility,
            timestamp: new Date().toISOString(),
            isReal: true
        });
    } catch (error) {
        console.warn('API Error, falling back to mock:', error.message);
        res.json({
            location: "Nakhon Phanom",
            temp: 31,
            condition: "Clear",
            description: "ท้องฟ้าแจ่มใส (Safe Mode)",
            icon: "01d",
            humidity: 50,
            wind_speed: 2.1,
            isReal: false
        });
    }
});

const { cityPool: pool } = require('../config/db');

// Helper to save weather to DB
const saveToHistory = async (area, data) => {
    try {
        const sql = `INSERT INTO weather_history (area_id, area_name, temp, humidity, wind_speed, description, icon) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [
            area.id, 
            area.name, 
            data.temp || data.main?.temp, 
            data.humidity || data.main?.humidity, 
            data.wind_speed || data.wind?.speed, 
            data.description || data.weather?.[0]?.description, 
            data.icon || data.weather?.[0]?.icon
        ]);
    } catch (e) { console.error('SQL Save Error:', e.message); }
};

// ... (existing router.get('/') ) ...

// Get Weather for Multiple Areas (Real Data with SQL Persistence)
router.get('/areas', async (req, res) => {
    try {
        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            return res.json(AREAS.map(getMockData));
        }

        const areaResults = await Promise.all(AREAS.map(async (area) => {
            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${area.lat}&lon=${area.lon}&appid=${API_KEY}&units=metric&lang=th`;
                const response = await axios.get(url, { timeout: 3000 });
                const data = response.data;
                
                const result = {
                    ...area,
                    temp: data.main.temp,
                    humidity: data.main.humidity,
                    wind_speed: data.wind.speed,
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                    condition: data.weather[0].main,
                    isReal: true
                };

                // Async save to SQL (don't block response)
                saveToHistory(area, result);
                
                return result;
            } catch (e) {
                console.warn(`Area fetch failed for ${area.name}:`, e.message);
                return getMockData(area);
            }
        }));

        res.json(areaResults);
    } catch (error) {
        res.json(AREAS.map(getMockData));
    }
});

// GET Historical Weather for Sparklines
router.get('/history/:areaId', async (req, res) => {
    try {
        const { areaId } = req.params;
        const [rows] = await pool.query(
            'SELECT temp, timestamp FROM weather_history WHERE area_id = ? ORDER BY timestamp DESC LIMIT 10',
            [areaId]
        );
        res.json(rows.reverse()); // Chronological order
    } catch (e) {
        // Fallback sparkline data when MySQL is unavailable
        const mock = [];
        for (let i = 9; i >= 0; i--) {
            mock.push({ temp: Math.round(28 + Math.random() * 6), timestamp: new Date(Date.now() - i * 3600000) });
        }
        res.json(mock);
    }
});

// Get 5-Day Forecast
router.get('/forecast', async (req, res) => {
    try {
        const LAT = 17.3996;
        const LON = 104.7696;

        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
            const today = new Date();
            return res.json({
                city: "Nakhon Phanom (Demo)",
                list: Array(5).fill(0).map((_, i) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i + 1);
                    return {
                        dt: Math.floor(d.getTime() / 1000),
                        dt_txt: d.toISOString().replace('T', ' ').substring(0, 19),
                        temp: 31 + Math.random() * 4,
                        condition: "Clear",
                        description: "ท้องฟ้าแจ่มใส",
                        icon: "01d",
                        humidity: 50,
                        wind_speed: 1.2
                    };
                }),
                isReal: false
            });
        }

        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=th`;
        const response = await axios.get(url, { timeout: 5000 });
        
        const dailyForecast = response.data.list.filter(item => item.dt_txt.includes("12:00:00"));

        res.json({
            city: response.data.city.name,
            list: dailyForecast.map(item => ({
                dt: item.dt,
                dt_txt: item.dt_txt,
                temp: item.main.temp,
                feels_like: item.main.feels_like,
                humidity: item.main.humidity,
                condition: item.weather[0].main,
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                wind_speed: item.wind.speed
            })),
            isReal: true
        });
    } catch (error) {
        const today = new Date();
        res.json({
            city: "Nakhon Phanom (Fallback)",
            list: Array(5).fill(0).map((_, i) => {
                const d = new Date(today);
                d.setDate(today.getDate() + i + 1);
                return {
                    dt: Math.floor(d.getTime() / 1000),
                    dt_txt: d.toISOString().replace('T', ' ').substring(0, 19),
                    temp: 32,
                    condition: "Clear",
                    description: "ท้องฟ้าแจ่มใส (Safe Mode)",
                    icon: "01d",
                    humidity: 50,
                    wind_speed: 1.5
                };
            }),
            error: error.message,
            isReal: false
        });
    }
});

module.exports = router;
