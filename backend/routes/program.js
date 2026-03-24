const express = require('express');
const router = express.Router();
const Program = require('../models/Program');
const User = require('../models/User');

// Get all programs
router.get('/', async (req, res) => {
    try {
        const programs = await Program.getAll();
        res.json({ status: "success", data: programs });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
