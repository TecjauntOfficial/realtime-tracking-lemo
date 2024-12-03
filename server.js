const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const path = require('path');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// Redis client setup
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis connected');
    } catch (err) {
        console.error('Redis connection error:', err);
    }
})();

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Routes
app.get('/', (req, res) => res.send('Server is running'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Import and use modules
require('./liveLocation')(io, redisClient);
require('./chat')(io, redisClient);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
