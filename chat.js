const handleChat = (io, redisClient) => {
    // Store active users
    const activeUsers = new Map();

    io.of('/chat').on('connection', async (socket) => {
        console.log('Chat client connected:', socket.id);

        // Handle user joining
        socket.on('userJoined', async (userData) => {
            activeUsers.set(socket.id, {
                id: socket.id,
                ...userData
            });
            
            // Broadcast updated user list
            const users = Array.from(activeUsers.values());
            io.of('/chat').emit('userList', users);
        });

        // Join chat room
        socket.on('joinRoom', async (roomId) => {
            socket.join(roomId);
            console.log(`User joined room: ${roomId}`);

            // Get room's chat history
            try {
                const messages = await redisClient.lRange(`chat:${roomId}`, 0, -1);
                const parsedMessages = messages.map(msg => JSON.parse(msg));
                socket.emit('chatHistory', parsedMessages);
            } catch (error) {
                console.error('Error fetching chat history:', error);
                socket.emit('chatHistory', []);
            }
        });

        // Handle messages
        socket.on('sendMessage', async (data) => {
            const { roomId, message } = data;
            const user = activeUsers.get(socket.id);
            
            if (!user) return;

            const messageData = {
                id: Date.now().toString(),
                userId: socket.id,
                userName: user.name,
                message,
                timestamp: new Date().toISOString()
            };

            try {
                // Save to Redis
                await redisClient.lPush(`chat:${roomId}`, JSON.stringify(messageData));
                // Broadcast to room
                io.of('/chat').to(roomId).emit('newMessage', messageData);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Handle room messages deletion
        socket.on('clearChat', async (roomId) => {
            try {
                await redisClient.del(`chat:${roomId}`);
                io.of('/chat').to(roomId).emit('chatCleared');
            } catch (error) {
                console.error('Error clearing chat:', error);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            activeUsers.delete(socket.id);
            io.of('/chat').emit('userList', Array.from(activeUsers.values()));
            console.log('Chat client disconnected:', socket.id);
        });
    });
};

module.exports = handleChat;