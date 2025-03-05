// Direction Test Client - For testing direction parameter
const io = require('socket.io-client');
const socket = io('http://13.236.156.205:3000'); // Change to your server address if needed

// Connected event
socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    
    // Join tracking room for a specific driver
    const testDriverId = 'test-driver-123';
    socket.emit('trackDriver', testDriverId);
    console.log(`Tracking driver: ${testDriverId}`);
    
    // Send test location update with direction
    sendTestLocation(testDriverId);
});

function sendTestLocation(driverId) {
    const testLocation = {
        driverId,
        location: {
            latitude: 31.5314625,
            longitude: 74.3528142
        },
        direction: "NORTH-EAST",
        updateCount: 1
    };
    
    console.log('Sending driverLocation with direction:', testLocation.direction);
    socket.emit('driverLocation', testLocation);
}

// Listen for location updates
socket.on('locationUpdate', (data) => {
    console.log('\nReceived locationUpdate:');
    console.log('- Driver ID:', data.driverId);
    console.log('- Direction:', data.direction);
    console.log('- Location:', data.location);
    console.log('- Timestamp:', data.timestamp);
    
    // Check if direction is received
    if (data.direction) {
        console.log('✅ Direction parameter received successfully!');
    } else {
        console.log('❌ Direction parameter is missing!');
    }
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});
