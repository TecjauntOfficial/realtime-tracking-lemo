module.exports = function(io, redisClient) {
    io.on('connection', (socket) => {
        console.log('Live location client connected:', socket.id);

        // Handle driver location updates
        socket.on('driverLocation', async (data) => {
            const { driverId, location } = data;
            console.log(`Driver ${driverId} location:`, location);

            // Save to Redis
            await redisClient.set(`driver:${driverId}`, JSON.stringify(location));

            // Broadcast location update to the relevant room
            io.to(`ride:${driverId}`).emit('locationUpdate', {
                driverId,
                location,
                timestamp: new Date().toISOString(),
            });
        });

        // Join tracking room
        socket.on('trackDriver', (driverId) => {
            socket.join(`ride:${driverId}`);
            console.log(`Socket ${socket.id} joined room ride:${driverId}`);
        });

        // Leave tracking room
        socket.on('stopTracking', (driverId) => {
            socket.leave(`ride:${driverId}`);
            console.log(`Socket ${socket.id} left room ride:${driverId}`);
        });

        socket.on('disconnect', () => {
            console.log('Live location client disconnected:', socket.id);
        });
    });
};
