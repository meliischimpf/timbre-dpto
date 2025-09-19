// pages/api/sendTimbre.js
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Obtener el ID de la sala desde el cuerpo de la solicitud
    const { salaId } = req.body;
    
    if (!salaId) {
      return res.status(400).json({ 
        error: 'Se requiere el ID de la sala' 
      });
    }

    // Verificar que el servidor de WebSocket esté inicializado
    if (!res.socket.server.io) {
      console.error('Error: Servidor de WebSocket no inicializado');
      return res.status(500).json({ 
        error: 'Servidor de WebSocket no inicializado' 
      });
    }

    console.log(`📢 Intentando activar timbre en la sala: ${salaId}`);
    
    // Obtener la lista de salas activas (solo para depuración)
    const rooms = res.socket.server.io.sockets.adapter.rooms;
    console.log('Salas activas:', [...rooms.keys()]);
    
    // Verificar si la sala existe
    const room = rooms.get(salaId);
    if (!room) {
      console.error(`❌ Error: La sala ${salaId} no existe o no tiene clientes conectados`);
      return res.status(404).json({ 
        error: `La sala ${salaId} no existe o no tiene clientes conectados`,
        salasDisponibles: [...rooms.keys()]
      });
    }
    
    console.log(`👥 Clientes en la sala ${salaId}:`, room.size);
    
    // Emitir el evento de timbre a todos los clientes en la sala
    res.socket.server.io.to(salaId).emit('timbre', { 
      timestamp: new Date().toISOString(),
      message: '¡Alguien está en la puerta!',
      salaId,
      origen: 'sendTimbre-API'
    });
    
    console.log(`🔔 Timbre activado en la sala: ${salaId}`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Timbre activado correctamente',
      salaId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al activar el timbre:', error);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
