const io = require('socket.io-client');

// Connect to the chat namespace
const socket = io('http://13.236.156.205:3000/chat');

// Handle connection
socket.on('connect', () => {
    console.log('Connected to chat server with socket ID:', socket.id);

    // Emit userJoined event with user data
    socket.emit('userJoined', { name: 'TestUser' });

    // Join a chat room
    const roomId = 'testRoom';
    socket.emit('joinRoom', roomId);

    // Send a test message after joining the room
    socket.emit('sendMessage', {
        roomId,
        message: 'working now !'
    });

    // Optionally, clear the chat history after some time (e.g., 10 seconds)
    /*
    setTimeout(() => {
        socket.emit('clearChat', roomId);
    }, 10000);
    */
});

// Listen for the list of active users
socket.on('userList', (users) => {
    console.log('Active users:', users);
});

// Listen for chat history when joining a room
socket.on('chatHistory', (messages) => {
    console.log('Chat history:', messages);
});

// Listen for new incoming messages
socket.on('newMessage', (message) => {
    console.log('New message received:', message);
});

// Listen for chat cleared event
socket.on('chatCleared', () => {
    console.log('Chat has been cleared.');
});

// Handle disconnection
socket.on('disconnect', () => {
    console.log('Disconnected from chat server');
});