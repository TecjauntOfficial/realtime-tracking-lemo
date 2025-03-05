const io = require('socket.io-client');

// Create socket connection
const socket = io('http://13.236.156.205:3000', {
  transports: ['websocket'],
  forceNew: true
});

// Driver ID for testing
const testDriverId = 'simple-test-driver';

socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  
  // Join tracking room for the test driver
  socket.emit('trackDriver', testDriverId);
  console.log(`Now tracking driver: ${testDriverId}`);
  
  // Send a test message after a short delay to ensure tracking is set up
  setTimeout(sendTestMessage, 1000);
});

function sendTestMessage() {
  // Very simple test data with direction
  const testData = {
    driverId: testDriverId,
    location: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    direction: "TEST-DIRECTION",
    updateCount: 1
  };
  
  console.log('\nSending test data:', JSON.stringify(testData, null, 2));
  socket.emit('driverLocation', testData);
}

// Listen for updates
socket.on('locationUpdate', (data) => {
  console.log('\nReceived locationUpdate:');
  console.log(JSON.stringify(data, null, 2));
  
  // Validate fields
  const fields = ['driverId', 'location', 'direction', 'timestamp', 'updateCount'];
  const missingFields = fields.filter(field => data[field] === undefined);
  
  if (missingFields.length > 0) {
    console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
  } else {
    console.log('✅ All expected fields are present');
  }
  
  // Specifically check direction
  if (data.direction) {
    console.log(`✅ Direction verified: ${data.direction}`);
  } else {
    console.log('❌ Direction is missing or undefined');
  }
});

// Error handling
socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Run for 10 seconds then exit
setTimeout(() => {
  console.log('Test complete, exiting...');
  socket.disconnect();
  process.exit(0);
}, 10000);
