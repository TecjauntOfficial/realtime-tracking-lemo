// testClient.js
const io = require('socket.io-client');
const socket = io('http://13.236.156.205:3000');

function generateLocation(baseLocation) {
    // Generate random location changes
    const latChange = (Math.random() - 0.5) * 0.001;
    const lngChange = (Math.random() - 0.5) * 0.001;
    
    // Determine direction based on changes
    let direction;
    if (Math.abs(latChange) > Math.abs(lngChange)) {
        direction = latChange > 0 ? "NORTH" : "SOUTH";
    } else {
        direction = lngChange > 0 ? "EAST" : "WEST";
    }
    
    return {
        latitude: baseLocation.latitude + latChange,
        longitude: baseLocation.longitude + lngChange,
        direction: direction
    };
}

const driverId = 'driver234';
const baseLocation = { latitude: 40.7128, longitude: -74.0060 };
let updateCount = 0;

// Connect and start updates
socket.on('connect', () => {
    console.log('\n=== Connected to server ===\n');
    
    socket.emit('trackDriver', driverId);
    console.log(`Tracking started for Driver ${driverId}\n`);
    
    // Start periodic updates
    sendLocationUpdate(); // Send first update immediately
    setInterval(sendLocationUpdate, 200); // Then every 3 seconds
});

function sendLocationUpdate() {
    updateCount++;
    const locationData = generateLocation(baseLocation);
    
    const updateData = {
        driverId,
        location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
        },
        direction: locationData.direction,
        updateCount
    };
    
    socket.emit('driverLocation', updateData);
    console.log(`[${new Date().toISOString()}] Update #${updateCount} sent:`, 
        { location: updateData.location, direction: updateData.direction });
}

// Listen for broadcasts
socket.on('locationUpdate', (data) => {
    console.log(`[${data.timestamp}] Received broadcast:`, 
        { location: data.location, direction: data.direction });
});

// Error handling
socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
});

socket.on('disconnect', () => {
    console.log('\n=== Disconnected from server ===\n');
});

// Clean shutdown
process.on('SIGINT', () => {
    console.log('\nStopping updates and disconnecting...');
    socket.disconnect();
    process.exit();
});