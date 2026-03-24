const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ status: "error", message: "Missing required fields" });
        }
        
        // Simple duplicate check (can be expanded in model later)
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ status: "error", message: "Email already registered" });
        }

        const newUser = await User.create({ username, email, password });
        res.status(201).json({ status: "success", data: newUser });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user || user.password !== password) {
            return res.status(401).json({ status: "error", message: "Invalid email or password" });
        }

        res.json({ status: "success", data: user });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Get Profile
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
        res.json({ status: "success", data: user });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Upgrade to Premium
router.post('/upgrade', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ status: "error", message: "User ID is required" });
        
        await User.upgradeToPremium(userId);
        res.json({ status: "success", message: "Upgraded to Premium successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
