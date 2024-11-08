const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const path = require('path');

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
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});


io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Middleware to log all events received by the server
    socket.use((packet, next) => {
        const eventName = packet[0];
        const eventData = packet[1];

        // Emit event to dashboard clients
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: eventName,
            data: eventData,
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });

        next();
    });

    // Join the dashboard room if the client is the dashboard
    socket.on('joinDashboard', () => {
        socket.join('dashboard');
        console.log(`Socket ${socket.id} joined the dashboard room`);
    });

    // Handle driver location updates
    socket.on('driverLocation', async (data) => {
        try {
            const { driverId, location } = data;
            console.log(`[${new Date().toISOString()}] Received update from ${driverId}:`, location);

            // Save to Redis
            await redisClient.set(`driver:${driverId}`, JSON.stringify(location));

            // Broadcast to specific room/channel
            io.to(`ride:${driverId}`).emit('locationUpdate', {
                driverId,
                location,
                timestamp: new Date().toISOString()
            });

            // Emit event to dashboard for sent data
            io.to('dashboard').emit('event', {
                direction: 'sent',
                event: 'locationUpdate',
                data: {
                    driverId,
                    location,
                    timestamp: new Date().toISOString()
                },
                socketId: socket.id,
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

        // Emit event to dashboard
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'trackDriver',
            data: { driverId },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    // Leave tracking room
    socket.on('stopTracking', (driverId) => {
        socket.leave(`ride:${driverId}`);
        console.log(`Socket ${socket.id} left room: ride:${driverId}`);

        // Emit event to dashboard
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'stopTracking',
            data: { driverId },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));