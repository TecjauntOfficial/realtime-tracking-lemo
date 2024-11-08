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

// Explicitly set the dashboard route
app.get('/dashboard', (req, res) => {
    console.log('Dashboard requested');
    console.log('Current directory:', __dirname);
    console.log('Attempting to serve:', path.join(__dirname, 'dashboard.html'));
    
    // Send the dashboard.html file
    res.sendFile(path.join(__dirname, 'dashboard.html'), (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error loading dashboard');
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinDashboard', () => {
        socket.join('dashboard');
        console.log(`Socket ${socket.id} joined the dashboard room`);
        
        io.to('dashboard').emit('event', {
            direction: 'received',
            event: 'dashboardConnected',
            data: { message: 'Dashboard connected successfully' },
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    socket.use((packet, next) => {
        const eventName = packet[0];
        const eventData = packet[1];
        
        console.log(`Logging event: ${eventName}`, eventData);

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
    console.log(`Dashboard available at http://localhost:${PORT}/dashboard`);
});