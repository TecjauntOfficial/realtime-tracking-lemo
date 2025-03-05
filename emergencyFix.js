// This file contains emergency fixes for the direction problem
// Include these functions in your server.js if the previous fixes don't work

// Alternative approach using stringification to preserve all fields
function broadcastLocationWithDirection(io, room, data) {
  // First stringify then parse to ensure clean object
  const stringified = JSON.stringify({
    driverId: data.driverId,
    location: data.location,
    direction: data.direction,
    timestamp: new Date().toISOString(),
    updateCount: data.updateCount
  });
  
  // Parse back to object
  const cleanData = JSON.parse(stringified);
  
  // Send through socket.io
  io.to(room).emit("locationUpdate", cleanData);
  
  // Log the exact data being sent
  console.log("Emergency fix - sending:", cleanData);
  console.log("Direction being sent:", cleanData.direction);
}

// Use this function in your driverLocation handler as a replacement for the emit call
