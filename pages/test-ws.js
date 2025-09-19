import { useEffect, useState } from 'react';

export default function TestWebSocket({ isSocketConnected, socket }) {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState('sala-1'); // Valor por defecto
  const [currentRoom, setCurrentRoom] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Función para agregar mensajes al registro
  const addMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: `[${timestamp}] ${message}`,
      timestamp
    }]);
  };

  useEffect(() => {
    if (socket) {
      // Escuchar mensajes de bienvenida
      const onWelcome = (data) => {
        addMessage(`✅ Conectado al servidor WebSocket`);
        addMessage(`ID de conexión: ${socket.id}`);
      };

      // Escuchar confirmación de unión a sala
      const onJoinResponse = (response) => {
        if (response.success) {
          setCurrentRoom(roomId);
          addMessage(`✅ Unido a la sala: ${roomId}`);
        } else {
          addMessage(`❌ Error al unirse a la sala: ${response.error || 'Error desconocido'}`);
        }
        setIsJoining(false);
      };

      // Escuchar eventos de timbre
      const onTimbre = (data) => {
        addMessage(`🔔 ¡Timbre sonando! (${new Date(data.timestamp).toLocaleTimeString()})`);
        // Reproducir sonido
        playSound();
      };

      // Configurar listeners
      socket.on('connect', onWelcome);
      socket.on('unirse-sala-response', onJoinResponse);
      socket.on('timbre', onTimbre);

      // Limpiar listeners al desmontar
      return () => {
        socket.off('connect', onWelcome);
        socket.off('unirse-sala-response', onJoinResponse);
        socket.off('timbre', onTimbre);
      };
    }
  }, [socket, roomId]);

  // Función para reproducir sonido de timbre
  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error al reproducir sonido:', error);
      addMessage('🔇 No se pudo reproducir el sonido (el navegador puede estar silenciado)');
    }
  };

  // Manejar unión a sala
  const handleJoinRoom = (e) => {
    e?.preventDefault();
    if (roomId && socket && !isJoining) {
      setIsJoining(true);
      addMessage(`Intentando unirse a la sala: ${roomId}...`);
      socket.emit('unirse-sala', roomId);
    }
  };

  // Manejar activación del timbre
  const handleRing = (e) => {
    e?.preventDefault();
    if (currentRoom && socket) {
      const data = {
        room: currentRoom,
        message: '¡Timbre sonando!',
        timestamp: new Date().toISOString()
      };
      socket.emit('timbre', data);
      addMessage(`🔔 Timbre activado en sala: ${currentRoom}`);
      playSound();
    } else {
      addMessage('❌ Únete a una sala primero');
    }
  };

  // Manejar cambio de ID de sala
  const handleRoomIdChange = (e) => {
    setRoomId(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Encabezado */}
        <div className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold">Prueba de Timbre Web</h1>
          <div className="flex items-center mt-2">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className="text-sm">
              {isSocketConnected ? 'Conectado al servidor' : 'Desconectado'}
              {socket?.id && ` (ID: ${socket.id.substring(0, 8)}...)`}
            </span>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="p-4 md:p-6">
          {/* Formulario de conexión */}
          <form onSubmit={handleJoinRoom} className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-blue-800">Conectar a una sala</h2>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">ID de la sala</label>
                <input
                  id="roomId"
                  type="text"
                  value={roomId}
                  onChange={handleRoomIdChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: sala-1"
                />
              </div>
              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={!isSocketConnected || isJoining || !roomId.trim()}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isJoining ? 'Conectando...' : 'Unirse'}
                </button>
              </div>
            </div>
            
            {currentRoom && (
              <div className="mt-3 p-2 bg-green-50 text-green-800 text-sm rounded border border-green-200">
                ✅ Conectado a: <span className="font-mono font-bold">{currentRoom}</span>
              </div>
            )}
          </form>
          
          {/* Botón de timbre */}
          <div className="mb-6 text-center">
            <button
              onClick={handleRing}
              disabled={!isSocketConnected || !currentRoom}
              className={`px-8 py-4 text-xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 ${
                isSocketConnected && currentRoom 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              🔔 TOCAR TIMBRE
            </button>
            <p className="mt-2 text-sm text-gray-600">
              {!currentRoom 
                ? 'Únete a una sala para activar el timbre' 
                : 'Haz clic para tocar el timbre en esta sala'}
            </p>
          </div>
          
          {/* Registro de eventos */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Registro de eventos</h2>
              <button 
                onClick={() => setMessages([])}
                className="text-sm text-gray-500 hover:text-gray-700"
                disabled={messages.length === 0}
              >
                Limpiar
              </button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md h-64 overflow-y-auto font-mono text-sm">
              {messages.length === 0 ? (
                <div className="text-gray-400 h-full flex items-center justify-center">
                  Los eventos de conexión aparecerán aquí
                </div>
              ) : (
                <ul className="space-y-1">
                  {messages.map((msg) => (
                    <li 
                      key={msg.id} 
                      className={`p-2 rounded ${
                        msg.text.includes('Error') || msg.text.includes('❌') 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-white'
                      }`}
                    >
                      <span className="text-gray-500 mr-2">[{msg.timestamp}]</span>
                      <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        
        {/* Pie de página */}
        <div className="bg-gray-50 px-4 py-3 text-center text-xs text-gray-500 border-t">
          <p>Prueba de conexión WebSocket - Timbre Inteligente</p>
          <p className="mt-1">Usa la misma ID de sala en varios dispositivos para probar la funcionalidad</p>
        </div>
      </div>
    </div>
  );
}
