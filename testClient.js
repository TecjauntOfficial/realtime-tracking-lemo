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

// Test as both driver and tracker
const driverId = 'driver12123213123214';
const baseLocation = { latitude: 40.7128, longitude: -74.0060 };
let updateCount = 0;

// Debug logging for all events
socket.onAny((eventName, ...args) => {
    console.log(`\nReceived event "${eventName}":`, JSON.stringify(args, null, 2));
});

// Connect and start updates
socket.on('connect', () => {
    console.log('\n=== Connected to server ===\n');
    
    // Join tracking room for a different driver to test receiving
    const differentDriverId = 'driver999';
    socket.emit('trackDriver', differentDriverId);
    console.log(`Tracking started for Driver ${differentDriverId}\n`);
    
    // Start sending updates as our driver
    sendLocationUpdate(); // Send first update immediately
    const intervalId = setInterval(sendLocationUpdate, 3000); // Every 3 seconds

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

// Listen for broadcasts with more detailed logging
socket.on('locationUpdate', (data) => {
    console.log('\n=== Received Location Update ===');
    console.log(`Driver: ${data.driverId}`);
    console.log(`Location:`, data.location);
    console.log(`Timestamp: ${data.timestamp}`);
    console.log('===============================\n');
});

// Enhanced error handling
socket.on('connect_error', (error) => {
    console.error('\nConnection error:', error.message);
    console.error('Error details:', error);
});

socket.on('error', (error) => {
    console.error('\nSocket error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('\n=== Disconnected from server ===');
    console.log('Reason:', reason, '\n');
});

// Clean shutdown
process.on('SIGINT', () => {
    console.log('\nStopping updates and disconnecting...');
    socket.disconnect();
    process.exit();
});