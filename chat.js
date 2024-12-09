const handleChat = (io, redisClient) => {
    const chatNamespace = io.of('/chat');
    const activeUsers = new Map();

    // Debug helper for active users
    const logActiveUsers = () => {
        console.log('\nActive Users:', Array.from(activeUsers.entries()));
    };

    chatNamespace.on('connection', async (socket) => {
        console.log('\n=== New Chat Client Connected ===');
        console.log('Socket ID:', socket.id);

        // Handle user joining
        socket.on('userJoined', async (userData) => {
            console.log('\n👤 User joined:', userData.fullName);
            
            activeUsers.set(socket.id, {
                id: socket.id,
                name: userData.fullName,
                avatar: userData.profilePicture
            });
            
            // Broadcast updated user list
            const users = Array.from(activeUsers.values());
            chatNamespace.emit('updateUserList', users);
            logActiveUsers();
        });

        // Handle joining room
        socket.on('joinRoom', async (roomId) => {
            console.log(`\n🚪 User ${socket.id} joining room: ${roomId}`);
            await socket.join(roomId);

            try {
                // Get chat history
                const messages = await redisClient.lRange(`chat:${roomId}`, 0, -1);
                const parsedMessages = messages
                    .map(msg => {
                        try {
                            return JSON.parse(msg);
                        } catch (e) {
                            console.error('Error parsing message:', e);
                            return null;
                        }
                    })
                    .filter(Boolean)
                    .reverse(); // Most recent first

                console.log(`📚 Sending ${parsedMessages.length} messages from history`);
                socket.emit('chatHistory', parsedMessages);
            } catch (error) {
                console.error('Error fetching chat history:', error);
                socket.emit('chatHistory', []);
            }
        });

        // Handle messages
        socket.on('sendMessage', async (data) => {
            const user = activeUsers.get(socket.id);
            if (!user) {
                console.error('User not found for socket:', socket.id);
                return;
            }

            const messageData = {
                id: Date.now().toString(),
                sender: data.sender,
                userId: socket.id,
                message: data.message,
                timestamp: new Date().toISOString()
            };

            try {
                // Save to Redis
                await redisClient.lPush(`chat:${data.roomId}`, JSON.stringify(messageData));
                
                // Broadcast to room
                chatNamespace.to(data.roomId).emit('messageReceived', messageData);
                console.log(`\n📨 Message sent in room ${data.roomId}:`, data.message);
            } catch (error) {
                console.error('Error handling message:', error);
                socket.emit('messageError', { message: 'Failed to send message' });
            }
        });

        // Typing indicators
        socket.on('startTyping', (data) => {
            socket.to(data.roomId).emit('userTyping', { user: data.user });
        });

        socket.on('stopTyping', (data) => {
            socket.to(data.roomId).emit('userStopTyping', { user: data.user });
        });

        // Handle chat clearing
        socket.on('deleteChat', async (roomId) => {
            try {
                await redisClient.del(`chat:${roomId}`);
                chatNamespace.to(roomId).emit('chatCleared');
                console.log(`\n🗑️ Chat cleared for room: ${roomId}`);
            } catch (error) {
                console.error('Error clearing chat:', error);
                socket.emit('chatError', { message: 'Failed to clear chat' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('\n❌ Client disconnected:', socket.id);
            activeUsers.delete(socket.id);
            chatNamespace.emit('updateUserList', Array.from(activeUsers.values()));
            logActiveUsers();
        });
    });
};

module.exports = handleChat;