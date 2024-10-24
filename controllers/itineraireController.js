const axios = require('axios');

const getItineraire = async (req, res) => {
    try {
        const { longStart, latStart, longEnd, latEnd } = req.query;

        // Build the OSRM API URL with the provided coordinates
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${longStart},${latStart};${longEnd},${latEnd}?geometries=geojson`;

        // Send a GET request to the OSRM API
        const response = await axios.get(osrmUrl);

        // Return the response data from OSRM
        res.json(response.data.routes[0].geometry.coordinates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching route data' });
    }
};

module.exports = { getItineraire };
