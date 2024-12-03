// testClient.js
const io = require('socket.io-client');
const socket = io('http://3.27.222.220:3000');

function generateLocation(baseLocation) {
    return {
        latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.001,
        longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.001
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
    setInterval(sendLocationUpdate, 1000); // Then every 3 seconds
});

function sendLocationUpdate() {
    updateCount++;
    const location = generateLocation(baseLocation);
    
    const updateData = {
        driverId,
        location,
        updateCount
    };
    
    socket.emit('driverLocation', updateData);
    console.log(`[${new Date().toISOString()}] Update #${updateCount} sent:`, location);
}

// Listen for broadcasts
// In testClient.js
socket.on('locationUpdate', (data) => {
    console.log(`[${data.timestamp}] Received broadcast:`, data.location);
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