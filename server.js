const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const path = require('path');
const handleChat = require('./chat');
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

        // Initialize chat handling after Redis is connected
        handleChat(io, redisClient);
    } catch (err) {
        console.error('Redis connection error:', err);
    }
})();

// Middleware to serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
    res.send('Server is running');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    console.log('Dashboard requested');
    console.log('Current directory:', __dirname);
    console.log('Attempting to serve:', path.join(__dirname, 'dashboard.html'));
    
    res.sendFile(path.join(__dirname, 'dashboard.html'), (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error loading dashboard');
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Log connection info
    console.log('\n=== New Client Connected ===');
    console.log('Socket ID:', socket.id);
    console.log('Active rooms:', io.sockets.adapter.rooms);
    console.log('Total connected clients:', io.engine.clientsCount);
    console.log('============================\n');

    // Handle driver location updates
    socket.on('driverLocation', async (data) => {
        try {
            const { driverId, location, updateCount } = data;
            
            // Log detailed update information
            console.log(`\n[${new Date().toISOString()}] Processing location update:`);
            console.log('Driver ID:', driverId);
            console.log('Update count:', updateCount);
            console.log('Location:', location);
            console.log('Connected sockets in room:', io.sockets.adapter.rooms.get(`ride:${driverId}`)?.size || 0);

            // Save to Redis
            await redisClient.set(`driver:${driverId}`, JSON.stringify(location));
            
            // Broadcast to specific room/channel
            const roomName = `ride:${driverId}`;
            const result = io.to(roomName).emit('locationUpdate', {
                driverId,
                location,
                timestamp: new Date().toISOString()
            });
            
            // Log broadcast results
            console.log('Broadcast result:', result);
            console.log('Room name:', roomName);
            console.log('Sockets in room:', io.sockets.adapter.rooms.get(roomName)?.size || 0);

            // Emit event to dashboard
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
        const roomName = `ride:${driverId}`;
        socket.join(roomName);
        console.log(`\nSocket ${socket.id} joined room: ${roomName}`);
        console.log('Sockets in room:', io.sockets.adapter.rooms.get(roomName)?.size || 0);

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
        const roomName = `ride:${driverId}`;
        socket.leave(roomName);
        console.log(`\nSocket ${socket.id} left room: ${roomName}`);
        console.log('Sockets in room:', io.sockets.adapter.rooms.get(roomName)?.size || 0);

        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'stopTracking',
            data: { driverId },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    // Join dashboard room
    socket.on('joinDashboard', () => {
        socket.join('dashboard');
        console.log(`\nSocket ${socket.id} joined the dashboard room`);
        console.log('Sockets in dashboard:', io.sockets.adapter.rooms.get('dashboard')?.size || 0);
        
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'dashboardConnected',
            data: { message: 'Dashboard connected successfully' },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    // Middleware for logging all events
    socket.use((packet, next) => {
        const [eventName, eventData] = packet;
        
        console.log(`\nEvent received: ${eventName}`, eventData);

        io.to('dashboard').emit('event', {
            direction: 'received',
            event: eventName,
            data: eventData,
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });

        next();
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('\n=== Client Disconnected ===');
        console.log('Socket ID:', socket.id);
        console.log('Remaining clients:', io.engine.clientsCount);
        console.log('==========================\n');
    });
});

// Error handling for the server
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n=== Server Started ===');
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}/dashboard`);
    console.log('====================\n');
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('\nSIGTERM received. Closing server...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});