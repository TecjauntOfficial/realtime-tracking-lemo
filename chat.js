const handleChat = (io, redisClient) => {
    // Store active users
    const activeUsers = new Map();

    const chatNamespace = io.of('/chat');
    
    chatNamespace.on('connection', async (socket) => {
        console.log('\n=== New Chat Client Connected ===');
        console.log('Socket ID:', socket.id);
        console.log('Total chat clients:', chatNamespace.sockets.size);
        console.log('===============================\n');

        // Handle user joining
        socket.on('userJoined', async (userData) => {
            console.log('\n=== User Joined ===');
            console.log('User data:', userData);
            console.log('Socket ID:', socket.id);
            
            activeUsers.set(socket.id, {
                id: socket.id,
                ...userData
            });
            
            const users = Array.from(activeUsers.values());
            console.log('Current active users:', users);
            
            // Broadcast updated user list to all clients
            chatNamespace.emit('userList', users);
            console.log('User list broadcasted to all clients');
            console.log('==================\n');
        });

        // Join chat room
        socket.on('joinRoom', async (roomId) => {
            console.log('\n=== User Joining Room ===');
            console.log('Room ID:', roomId);
            console.log('Socket ID:', socket.id);
            
            await socket.join(roomId);
            
            // Get room's chat history
            try {
                const messages = await redisClient.lRange(`chat:${roomId}`, 0, -1);
                console.log(`Retrieved ${messages.length} messages from history`);
                
                const parsedMessages = messages.map(msg => {
                    try {
                        return JSON.parse(msg);
                    } catch (e) {
                        console.error('Error parsing message:', msg);
                        return null;
                    }
                }).filter(msg => msg !== null);

                console.log('Sending chat history to user');
                socket.emit('chatHistory', parsedMessages);
                
                // Log room members
                const roomMembers = await chatNamespace.in(roomId).allSockets();
                console.log('Current room members:', Array.from(roomMembers));
                
            } catch (error) {
                console.error('Error in room joining process:', error);
                socket.emit('chatHistory', []);
            }
            console.log('=====================\n');
        });

        // Handle messages
        socket.on('sendMessage', async (data) => {
            console.log('\n=== New Message ===');
            console.log('Message data received:', data);
            
            const user = activeUsers.get(socket.id);
            if (!user) {
                console.error('User not found in active users. Socket ID:', socket.id);
                return;
            }

            const messageData = {
                id: Date.now().toString(),
                userId: socket.id,
                userName: user.name,
                message: data.message,
                timestamp: new Date().toISOString()
            };

            try {
                // Save to Redis
                await redisClient.lPush(`chat:${data.roomId}`, JSON.stringify(messageData));
                console.log('Message saved to Redis');

                // Get room members before broadcasting
                const roomMembers = await chatNamespace.in(data.roomId).allSockets();
                console.log('Broadcasting to room members:', Array.from(roomMembers));

                // Broadcast to room
                chatNamespace.to(data.roomId).emit('newMessage', messageData);
                console.log('Message broadcasted to room');
                
            } catch (error) {
                console.error('Error handling message:', error);
                socket.emit('messageError', { error: 'Failed to send message' });
            }
            console.log('==================\n');
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('\n=== Client Disconnected ===');
            console.log('Socket ID:', socket.id);
            
            activeUsers.delete(socket.id);
            const users = Array.from(activeUsers.values());
            
            console.log('Remaining active users:', users);
            chatNamespace.emit('userList', users);
            
            console.log('Total remaining clients:', chatNamespace.sockets.size);
            console.log('========================\n');
        });

        // Error handling
        socket.on('error', (error) => {
            console.error('\n=== Socket Error ===');
            console.error('Socket ID:', socket.id);
            console.error('Error:', error);
            console.error('==================\n');
        });
    });
};

module.exports = handleChat;