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

// Serve static files if needed
app.use(express.static(path.join(__dirname)));

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.send({ status: 'ok' });
});

// Dashboard route for serving HTML file
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'), (err) => {
        if (err) {
            console.error('Error loading dashboard:', err);
            res.status(500).send('Error loading dashboard');
        }
    });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle driver location updates
    socket.on('driverLocation', async (data) => {
        try {
            const { driverId, location, updateCount } = data;
            console.log(`[${new Date().toISOString()}] Update #${updateCount || 'N/A'} from ${driverId}:`, location);

            // Save to Redis
            await redisClient.set(`driver:${driverId}`, JSON.stringify(location));
            
            // Broadcast location update to specific driver's tracking room
            io.to(`ride:${driverId}`).emit('locationUpdate', {
                driverId,
                location,
                timestamp: new Date().toISOString()
            });

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
        socket.join(`ride:${driverId}`);
        console.log(`Socket ${socket.id} joined room: ride:${driverId}`);
    });

    // Leave tracking room
    socket.on('stopTracking', (driverId) => {
        socket.leave(`ride:${driverId}`);
        console.log(`Socket ${socket.id} left room: ride:${driverId}`);
    });

    // Join dashboard room
    socket.on('joinDashboard', () => {
        socket.join('dashboard');
        console.log(`Socket ${socket.id} joined the dashboard room`);
    });

    // Middleware for logging all events to the dashboard
    socket.use((packet, next) => {
        const [eventName, eventData] = packet;
        
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: eventName,
            data: eventData,
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });

        next();
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
