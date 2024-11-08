const io = require('socket.io-client');

// Connect to your server with proper options
const socket = io('http://3.27.222.220:3000', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

function generateLocation(baseLocation) {
    return {
        latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.001,
        longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.001
    };
}

const driverId = 'driver12123213123214';
const baseLocation = { latitude: 40.7128, longitude: -74.0060 };
let updateCount = 0;

// Connect and start updates
socket.on('connect', () => {
    console.log('\n=== Connected to server ===\n');
    
    // Join tracking room
    socket.emit('trackDriver', driverId);
    console.log(`Tracking started for Driver ${driverId}\n`);
    
    // Start periodic updates
    sendLocationUpdate(); // Send first update immediately
    const intervalId = setInterval(sendLocationUpdate, 500); // Then every 3 seconds

    // Clear interval on disconnect
    socket.on('disconnect', () => {
        clearInterval(intervalId);
    });
});

function sendLocationUpdate() {
    updateCount++;
    const location = generateLocation(baseLocation);
    
    const updateData = {
        driverId,
        location,
        updateCount,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('driverLocation', updateData);
    console.log(`[${updateData.timestamp}] Update #${updateCount} sent:`, location);
}

// Listen for broadcasts
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