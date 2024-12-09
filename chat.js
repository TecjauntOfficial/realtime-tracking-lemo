const handleChat = (io, redisClient) => {
    const chatNamespace = io.of('/chat');
    const activeUsers = new Map();

    chatNamespace.on('connection', async (socket) => {
        console.log('New chat client connected:', socket.id);

        socket.on('userJoined', async (userData) => {
            activeUsers.set(socket.id, userData);
            socket.join('main'); // Join default room
            console.log(`User joined: ${userData.fullName}`);
        });

        socket.on('sendMessage', async (data) => {
            try {
                const messageData = {
                    id: Date.now().toString(),
                    sender: data.sender,
                    message: data.message,
                    timestamp: new Date().toISOString()
                };

                // Save to Redis
                await redisClient.lPush(`chat:${data.roomId}`, JSON.stringify(messageData));

                // Broadcast to everyone EXCEPT sender
                socket.broadcast.to(data.roomId).emit('messageReceived', messageData);
                console.log(`Message broadcast to room ${data.roomId}`);

            } catch (error) {
                console.error('Error handling message:', error);
            }
        });
    });
};