const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// Get reviews for a place
router.get('/place/:placeId', async (req, res) => {
    try {
        const reviews = await Review.getByPlaceId(req.params.placeId);
        res.json({ status: "success", data: reviews });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Add a new review
router.post('/', async (req, res) => {
    try {
        const { place_id, user_id, rating, comment } = req.body;
        if (!place_id || !user_id || !rating) {
            return res.status(400).json({ status: "error", message: "Missing required fields" });
        }
        
        const newReview = await Review.add({ place_id, user_id, rating, comment });
        res.status(201).json({ status: "success", data: newReview });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = router;
