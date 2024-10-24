// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const routeRoutes = require('./routes/routeRoutes'); // Import routes

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // Use the routes
// app.use('/api', routeRoutes); // Mount the route under /api

// // Start Server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
// });


// serverA.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT_A = 3000;

let position_list = [];
let head_pointer = 0;
let tail_pointer = 0;


const fromatPosition = (currentPosition, prePosition) => {

    if (prePosition == null) {
        return currentPosition;
    }

    //calculate elapsed Time
    const elapsedTime = currentPosition.timestamps  - prePosition.timestamps;

    //calculate Distance
    const distance = calculateDistance(
        //previous Position
        prePosition.position[0],prePosition.position[1],
        //recent position
        currentPosition.position[0],currentPosition.position[1])

    const speed = calculateSpeed(elapsedTime,distance);

    console.log(" ################# distance :::::::::::::: ",distance)

    


    return {
        position: currentPosition,
        vitesse: speed,
        timestamps: currentPosition.timestamps
    }
}


function calculateSpeed(timeDifference, distanceInKm) {

    // Convert time difference to hours
    const timeInHours = timeDifference / (1000 * 60 * 60); // Convert milliseconds to hours

    // Calculate speed in km/h
    const speed = timeInHours > 0 ? distanceInKm / timeInHours : 0; // Avoid division by zero

    return speed; // Speed in km/h
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const toRad = (deg) => deg * (Math.PI / 180); // Convert degrees to radians

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
}


const getRandomValue = () => {
    const maxValue = 2;
    const minValue = 0.5;
    return ((maxValue - minValue) * Math.random()) + minValue;
}


// Function to fetch route data
const getItineraire = async (longStart, latStart, longEnd, latEnd) => {
    try {
        // while (!sendingPositions) {
        //     console.log(" .... wait for 2s for client to be connected ...");
        //     await new Promise(resolve => setTimeout(resolve, 2000));
        // }

        // Build the OSRM API URL with the provided coordinates
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${longStart},${latStart};${longEnd},${latEnd}?geometries=geojson`;

        // Send a GET request to the OSRM API
        const response = await axios.get(osrmUrl);
        const coordinates = response.data.routes[0].geometry.coordinates;

        let previousPosition = null;
        for (const position of coordinates) {
            await new Promise(resolve => {
                setTimeout(() => {
                    const currentPosition = {
                        position: position,
                        vitesse: 0,
                        timestamps: new Date()
                    }


                    position_list.push(
                        fromatPosition(
                            currentPosition,
                            previousPosition
                        )
                    );

                    previousPosition = currentPosition;

                    tail_pointer++;
                    console.log(" ====> position received ....", position);
                    resolve();
                }, 10000 * getRandomValue()); // Wait for 2 s multiply to Random seconds before the next insertion



            });
        }

    } catch (error) {
        console.error('Error fetching route data:', error);
        return null;
    }
};

io.on('connection', (socket) => {
    console.log('Client connected to Server A');

    // Send IMEI upon connection
    const imei = "H6S58E98R741D58E"; // Replace with actual IMEI
    let sendingPositions = false; // Initialize to false, only start after ACK

    socket.emit('sendIMEI', imei); // Send IMEI to the client

    // Listen for responses
    socket.on('response', (response) => {
        console.log('Response received:', response);

        if (response === 'ACK') {
            console.log('ACK received, starting to send positions.');
            sendingPositions = true; // Start sending positions
            fetchAndSendPositions(); // Call to fetch and send positions
        } else {
            console.log('Non-ACK response received, stopping position sending.');
            sendingPositions = false; // Stop sending positions
        }
    });

    // Function to send positions one by one
    const sendPositions = async () => {
        if (sendingPositions && head_pointer < tail_pointer) {
            socket.emit('positionUpdate', position_list[head_pointer]); // Emit the current position
            console.log('Sent position:', position_list[head_pointer]); // Log the sent position
            head_pointer++;

            // Wait for 2 seconds before sending the next position
            setTimeout(sendPositions, 2000);
        } else if (!sendingPositions) {
            console.log('Position sending stopped due to non-ACK response or client disconnect.');
        } else {
            console.log('All positions sent.');
        }
    };

    // Start sending positions after receiving IMEI response
    const fetchAndSendPositions = async () => {
        while (position_list.length === 0 || tail_pointer <= head_pointer) {
            console.log("  waiting for positions ...");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (position_list.length !== 0 && tail_pointer > head_pointer) {
            sendPositions(); // Call the function to send positions one by one
        }
    };

    // Stop sending positions when the client disconnects
    socket.on('disconnect', () => {
        console.log('Client disconnected from Server A');
        sendingPositions = false; // Set the flag to false to stop sending positions
    });
});

server.listen(PORT_A, () => {
    console.log(`Server A is running on http://localhost:${PORT_A}`);

    const longStart = -6.877802188431502;
    const latStart = 33.99088838806195;
    const longEnd = -6.769280482448096;
    const latEnd = 34.07893541257252;

    getItineraire(longStart, latStart, longEnd, latEnd);
});
