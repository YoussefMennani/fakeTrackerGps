const express = require('express');
const { getItineraire } = require('../controllers/itineraireController');

const router = express.Router();

// Define the GET route
router.get('/getItineraire', getItineraire);

module.exports = router;