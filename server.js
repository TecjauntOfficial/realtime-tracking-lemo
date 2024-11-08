const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Redis setup with async connection
const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

// Connect to Redis
(async () => {
    await redisClient.connect();
    console.log('Redis connected');
})().catch(err => console.error('Redis connection error:', err));

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.send({ status: 'ok' });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle driver location updates
   // Handle driver location updates
   socket.on('driverLocation', async (data) => {
    try {
        const { driverId, location } = data;
        console.log(`[${new Date().toISOString()}] Received update #${data.updateCount || 'N/A'} from ${driverId}:`, location);

        // Save to Redis
        await redisClient.set(`driver:${driverId}`, JSON.stringify(location));
        
        // Broadcast to specific room/channel
        io.to(`ride:${driverId}`).emit('locationUpdate', {
            driverId,
            location,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error handling location update:', error);
    }
});


    // Join specific driver's tracking room
    socket.on('trackDriver', (driverId) => {
        socket.join(`ride:${driverId}`);
        console.log(`Socket ${socket.id} joined room: ride:${driverId}`);
    });

    // Leave tracking room
    socket.on('stopTracking', (driverId) => {
        socket.leave(`ride:${driverId}`);
        console.log(`Socket ${socket.id} left room: ride:${driverId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));