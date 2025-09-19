import { Server } from 'socket.io';

let io = null;

const initSocket = (server) => {
  if (io) {
    console.log('Socket.IO ya está inicializado');
    return io;
  }

  console.log('Inicializando Socket.IO...');
  
  // Configuración del servidor Socket.IO
  io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000, // Aumentar el tiempo de espera de ping
    pingInterval: 25000, // Intervalo de ping
    cookie: false
  });
  
  // Almacenar la instancia en el servidor para acceso global
  server.io = io;
  
  // Manejar conexiones de clientes
  io.on('connection', (socket) => {
    console.log('✅ Nuevo cliente conectado:', socket.id);
    
    // Enviar un mensaje de bienvenida
    socket.emit('welcome', { 
      message: 'Conectado al servidor WebSocket',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // Cuando un cliente se une a una sala
    socket.on('unirse-sala', (salaId, callback) => {
      if (!salaId) {
        console.error('❌ Error: No se proporcionó un ID de sala');
        return callback({ success: false, error: 'Se requiere un ID de sala' });
      }
      
      socket.join(salaId);
      console.log(`👥 Cliente ${socket.id} se unió a la sala ${salaId}`);
      
      // Enviar confirmación al cliente
      callback({ 
        success: true, 
        salaId,
        message: `Unido a la sala ${salaId} correctamente`
      });
    });
    
    // Manejar eventos de timbre
    socket.on('timbre', (data) => {
      console.log('🔔 Evento de timbre recibido:', data);
      // Reenviar el evento a la sala específica
      socket.to(data.destino).emit('timbre', data);
    });
    
    // Manejar desconexión
    socket.on('disconnect', (reason) => {
      console.log(`❌ Cliente desconectado (${socket.id}):`, reason);
    });
    
    // Manejar errores
    socket.on('error', (error) => {
      console.error('❌ Error en el socket:', error);
    });
  });
  
  // Manejar errores del servidor
  io.engine.on('connection_error', (err) => {
    console.error('❌ Error de conexión en el servidor Socket.IO:', err);
  });
  
  console.log('✅ Socket.IO inicializado correctamente');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado. Llama a initSocket primero.');
  }
  return io;
};

const socketHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('Configurando Socket.IO...');
    initSocket(res.socket.server);
  } else {
    console.log('Socket.IO ya está en ejecución');
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default socketHandler;
