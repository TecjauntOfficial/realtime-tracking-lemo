const io = require('socket.io-client');
const socket = io('http://3.27.222.220:3000'); // Adjust the URL if needed

const roomId = 'room123';
const sender = 'user456';

// Connect to the server
socket.on('connect', () => {
    console.log('\n=== Connected to chat server ===\n');

    // Join the chat room
    socket.emit('joinChat', roomId);
    console.log(`Joined chat room: ${roomId}\n`);

    // Fetch chat history
    socket.emit('getChatHistory', roomId, (messages) => {
        console.log('Chat history:', messages);
    });

    // Send a test message
    sendMessage('Hello, this is a test message!');

    // Send additional messages after a delay
    setTimeout(() => sendMessage('This is another test message!'), 2000);
    setTimeout(() => sendMessage('Yet another test message!'), 4000);
});

// Function to send a message
function sendMessage(message) {
    const messageData = { roomId, sender, message };
    socket.emit('sendMessage', messageData);
    console.log(`[${new Date().toISOString()}] Sent message:`, message);
}

// Listen for received messages
socket.on('messageReceived', (data) => {
    console.log(`[${data.timestamp}] Received message from ${data.sender}:`, data.message);
});

// Error handling
socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
});

socket.on('disconnect', () => {
    console.log('\n=== Disconnected from chat server ===\n');
});

// Clean shutdown
process.on('SIGINT', () => {
    console.log('\nStopping chat client and disconnecting...');
    socket.disconnect();
    process.exit();
});