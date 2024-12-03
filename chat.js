module.exports = function(io, redisClient) {
    io.on('connection', (socket) => {
        console.log('Chat client connected:', socket.id);

        // Join chat room
        socket.on('joinChat', (roomId) => {
            socket.join(`chat:${roomId}`);
            console.log(`Socket ${socket.id} joined room chat:${roomId}`);
        });

        // Handle sending messages
        socket.on('sendMessage', async (data) => {
            const { roomId, sender, message } = data;
            const messageData = { sender, message, timestamp: new Date().toISOString() };

            // Save message to Redis
            await redisClient.lPush(`messages:${roomId}`, JSON.stringify(messageData));

            // Broadcast to chat room
            io.to(`chat:${roomId}`).emit('messageReceived', messageData);
        });

        // Fetch chat history
        socket.on('getChatHistory', async (roomId, callback) => {
            const messages = await redisClient.lRange(`messages:${roomId}`, 0, -1);
            callback(messages.map(JSON.parse));
        });

        socket.on('disconnect', () => {
            console.log('Chat client disconnected:', socket.id);
        });
    });
};
