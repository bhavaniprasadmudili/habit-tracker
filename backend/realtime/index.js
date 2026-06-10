const { Server } = require('socket.io');

let io;

function initRealtime(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.handshake.auth || {};
    if (userId) {
      socket.join(`user_${userId}`);
    }
    if (role === 'admin') {
      socket.join('admin_room');
    }

    socket.on('disconnect', () => {
      // cleanup handled by socket.io
    });
  });

  return io;
}

function publishEvent(event, payload, room) {
  if (!io) return;
  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

module.exports = { initRealtime, publishEvent };
