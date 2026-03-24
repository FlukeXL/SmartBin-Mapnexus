const express = require('express');
const router = express.Router();
const Checkin = require('../models/Checkin');
const User = require('../models/User');

// Create Check-in
router.post('/', async (req, res) => {
    try {
        const { userId, placeId, xpEarned } = req.body;
        
        if (!userId || !placeId) {
            return res.status(400).json({ status: "error", message: "Missing required fields" });
        }

        const newCheckin = await Checkin.create({ userId, placeId, xpEarned: xpEarned || 100 });
        
        // Award XP to user
        await User.updateXP(userId, xpEarned || 100);

        res.status(201).json({ status: "success", data: newCheckin });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Get User's Check-ins
router.get('/user/:userId', async (req, res) => {
    try {
        const checkins = await Checkin.getByUser(req.params.userId);
        res.json({ status: "success", data: checkins });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
