const express = require('express');
const router = express.Router();

const Place = require('../models/Place');

router.get('/', async (req, res) => {
    try {
        const places = await Place.getAll();
        res.json(places);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const newPlace = await Place.add(req.body);
        res.status(201).json(newPlace);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
