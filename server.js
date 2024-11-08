const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Redis setup with async connection
const redisClient = redis.createClient({
    url: 'redis://localhost:6379'
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.error('Redis connection error:', err);
    }
})();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Health check endpoint
app.get('/health', (req, res) => {
    const healthy = redisClient.isReady;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        redis: healthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Track connected clients
let connectedClients = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    connectedClients.add(socket.id);

    // Broadcast updated connection count
    io.emit('connectionCount', connectedClients.size);

    // Middleware to log all events
    socket.use((packet, next) => {
        const [eventName, eventData] = packet;
        console.log(`Event received - Name: ${eventName}, Socket ID: ${socket.id}`);
        console.log('Event data:', JSON.stringify(eventData, null, 2));

        // Emit to dashboard clients
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: eventName,
            data: eventData,
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });

        next();
    });

    // Handle dashboard connection
    socket.on('joinDashboard', () => {
        socket.join('dashboard');
        console.log(`Dashboard joined - Socket ID: ${socket.id}`);
        
        // Send welcome event
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'dashboardConnected',
            data: { 
                message: 'Dashboard connected successfully',
                activeConnections: connectedClients.size
            },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    // Handle driver location updates
    socket.on('driverLocation', async (data) => {
        try {
            const { driverId, location } = data;
            console.log(`Location update from driver ${driverId}:`, location);

            // Store in Redis
            await redisClient.set(`driver:${driverId}`, JSON.stringify({
                ...location,
                timestamp: new Date().toISOString()
            }));

            // Broadcast to tracking clients
            io.to(`ride:${driverId}`).emit('locationUpdate', {
                driverId,
                location,
                timestamp: new Date().toISOString()
            });

            // Notify dashboard
            io.to('dashboard').emit('event', {
                direction: 'sent',
                event: 'locationUpdate',
                data: { driverId, location },
                socketId: socket.id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error handling location update:', error);
            socket.emit('error', { message: 'Failed to process location update' });
        }
    });

    // Handle tracking requests
    socket.on('trackDriver', (driverId) => {
        socket.join(`ride:${driverId}`);
        console.log(`Client ${socket.id} started tracking driver ${driverId}`);
        
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'trackDriver',
            data: { driverId },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket.id);
        io.emit('connectionCount', connectedClients.size);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'An error occurred' });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}/dashboard`);
});

// Handle process termination
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing server...');
    await redisClient.quit();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});