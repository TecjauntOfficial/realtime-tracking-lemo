module.exports = function(io, redisClient) {
    io.on('connection', (socket) => {
        console.log('Chat client connected:', socket.id);

        // Join chat room
        socket.on('joinChat', (roomId) => {
            // Remove the chat: prefix to keep it simple
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId}`);
        });

        // Handle sending messages
        socket.on('sendMessage', async (data) => {
            const { roomId, sender, message, profilePicture } = data;
            const messageData = { 
                sender, 
                message, 
                profilePicture,
                timestamp: new Date().toISOString() 
            };

            try {
                // Save message to Redis
                await redisClient.lPush(`messages:${roomId}`, JSON.stringify(messageData));
                
                // Broadcast to everyone in the room including sender
                io.in(roomId).emit('messageReceived', messageData);
                
                console.log(`Message sent to room ${roomId}:`, messageData);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Fetch chat history
        socket.on('getChatHistory', async (roomId, callback) => {
            try {
                const messages = await redisClient.lRange(`messages:${roomId}`, 0, -1);
                const parsedMessages = messages.map(msg => JSON.parse(msg));
                callback(parsedMessages);
            } catch (error) {
                console.error('Error fetching chat history:', error);
                callback([]);
            }
        });

        // Delete chat history
        socket.on('deleteChat', async (roomId, callback) => {
            try {
                await redisClient.del(`messages:${roomId}`);
                io.in(roomId).emit('chatCleared');
                callback({ success: true });
            } catch (error) {
                console.error('Error deleting chat:', error);
                callback({ success: false, message: 'Failed to delete chat history' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Chat client disconnected:', socket.id);
        });
    });
};