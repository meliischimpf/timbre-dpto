// pages/api/socket.js
import { Server } from 'socket.io';

const socketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('✅ Socket is already running');
    res.end();
    return;
  }

  console.log('🚀 Initializing Socket.IO server...');
  
  // Create a new Socket.IO server with enhanced configuration
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false,
    allowEIO3: true,
    maxHttpBufferSize: 1e8,
    httpCompression: true,
    connectTimeout: 45000,
    upgradeTimeout: 10000,
    serveClient: false
  });
  
  // Handle server cleanup
  res.socket.server.on('close', () => {
    console.log('🔌 Server is closing, cleaning up WebSocket connections...');
    io.close();
  });

  // Store the io instance in the server
  res.socket.server.io = io;

  // Handle new connections
  io.on('connection', (socket) => {
    console.log('👤 New client connected:', socket.id);

    // Send a welcome message
    socket.emit('welcome', {
      message: 'Conectado al servidor WebSocket',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Handle joining a room
    socket.on('unirse-sala', (salaId, callback) => {
      console.log(`🔵 [Server] Unirse a sala solicitada:`, { salaId, socketId: socket.id });
      
      if (!salaId) {
        const errorMsg = '❌ Error: No se proporcionó un ID de sala';
        console.error(errorMsg);
        if (typeof callback === 'function') {
          return callback({ 
            success: false, 
            error: errorMsg 
          });
        }
        return;
      }
      
      // Leave any existing rooms
      if (socket.rooms.size > 1) {
        const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        rooms.forEach(room => {
          socket.leave(room);
          console.log(`🚪 Cliente ${socket.id} salió de la sala ${room}`);
        });
      }
      
      // Join the new room
      socket.join(salaId);
      console.log(`👥 Cliente ${socket.id} se unió a la sala ${salaId}`);
      
      const response = { 
        success: true, 
        message: `Unido a la sala ${salaId}`,
        room: salaId,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      };
      
      // Send response back to client
      if (typeof callback === 'function') {
        callback(response);
      }
      
      // Also emit a separate event for UI updates
      socket.emit('unirse-sala-response', response);
    });

    // Handle doorbell events
    socket.on('timbre', (data) => {
      console.log('🔔 Evento de timbre recibido:', data);
      if (!data.room) {
        console.error('❌ Error: No se especificó la sala para el timbre');
        return;
      }
      
      // Broadcast to the specific room
      const eventData = {
        ...data,
        timestamp: new Date().toISOString(),
        from: socket.id
      };
      
      console.log(`📢 Transmitiendo timbre a la sala ${data.room}`, eventData);
      socket.to(data.room).emit('timbre', eventData);
      
      // Also send back to sender for UI feedback
      socket.emit('timbre', { ...eventData, isSender: true });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`👋 Cliente desconectado (${socket.id}):`, reason);
      
      // Notify room members about the disconnection
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      rooms.forEach(room => {
        socket.to(room).emit('usuario-desconectado', {
          socketId: socket.id,
          room,
          timestamp: new Date().toISOString()
        });
      });
    });
  });

  console.log('✅ Socket.IO server initialized');
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default socketHandler;
