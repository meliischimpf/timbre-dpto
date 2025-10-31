import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import QRCode from 'qrcode.react';
import Head from 'next/head';

// Función para reproducir el sonido
const playDoorbellSound = () => {
  try {
    const audio = new Audio('/sounds/doorbell.mp3');
    audio.play().catch(error => {
      console.error('🔇 Error al reproducir el sonido:', error);
    });
  } catch (error) {
    console.error('🔇 Error al cargar el sonido:', error);
  }
};

export default function TestWebSocket() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const socketRef = useRef(null);
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState([]);

  // Generar un ID de sala aleatorio al cargar
  useEffect(() => {
    if (typeof window !== 'undefined' && !roomId) {
      const savedRoomId = localStorage.getItem('roomId');
      if (savedRoomId) {
        setRoomId(savedRoomId);
        setCurrentRoom(savedRoomId);
      } else {
        const newRoomId = `sala-${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('roomId', newRoomId);
        setRoomId(newRoomId);
        setCurrentRoom(newRoomId);
      }
    }
  }, []);

  // Conectar al WebSocket
  useEffect(() => {
    if (!roomId) return;

    // Usar wss:// solo en producción, ws:// en desarrollo
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketInstance = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    
    socketRef.current = socketInstance;

    const handleOpen = () => {
      console.log('✅ Conectado al servidor WebSocket');
      setIsConnected(true);
      
      // Unirse a la sala
      socketInstance.send(JSON.stringify({
        type: 'join',
        roomId: roomId
      }));
    };

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Mensaje recibido:', data);
        
        if (data.type === 'ring') {
          playDoorbellSound();
          setMessage('🔔 ¡Timbre sonando!');
          setTimeout(() => setMessage(''), 2000);
        }
      } catch (error) {
        console.error('Error al procesar el mensaje:', error);
      }
    };

    const handleClose = () => {
      console.log('❌ Desconectado del servidor');
      setIsConnected(false);
    };

    const handleError = (error) => {
      console.error('❌ Error en la conexión WebSocket:', error);
      setMessage('❌ Error de conexión');
      setTimeout(() => setMessage(''), 2000);
    };

    socketInstance.addEventListener('open', handleOpen);
    socketInstance.addEventListener('message', handleMessage);
    socketInstance.addEventListener('close', handleClose);
    socketInstance.addEventListener('error', handleError);

    setSocket(socketInstance);

    return () => {
      socketInstance.removeEventListener('open', handleOpen);
      socketInstance.removeEventListener('message', handleMessage);
      socketInstance.removeEventListener('close', handleClose);
      socketInstance.removeEventListener('error', handleError);
      
      if (socketInstance.readyState === WebSocket.OPEN) {
        socketInstance.close();
      }
    };
  }, [roomId]);

  // Manejar unión a sala
  const handleJoinRoom = (e) => {
    e?.preventDefault();
    if (roomId && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join',
        roomId: roomId
      }));
      setCurrentRoom(roomId);
      localStorage.setItem('roomId', roomId);
      setMessage(`✅ Unido a la sala: ${roomId}`);
      
      // Agregar mensaje al registro
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `✅ Unido a la sala: ${roomId}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Manejar activación del timbre
  const handleRing = useCallback(() => {
    try {
      const currentSocket = socketRef.current || socket;
      
      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(JSON.stringify({
          type: 'ring',
          roomId: roomId,
          timestamp: new Date().toISOString()
        }));
        setMessage('🔔 Timbre activado');
        setTimeout(() => setMessage(''), 2000);
      } else {
        console.error('WebSocket no está conectado. Estado:', currentSocket?.readyState);
        setMessage('❌ Error: No hay conexión');
        setTimeout(() => setMessage(''), 2000);
        
        // Intentar reconectar
        if (roomId) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const newSocket = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
          setSocket(newSocket);
          socketRef.current = newSocket;
        }
      }
    } catch (error) {
      console.error('Error al activar el timbre:', error);
      setMessage('❌ Error al activar el timbre');
      setTimeout(() => setMessage(''), 2000);
    }
  }, [socket, roomId]);

  // Manejar cambio de ID de sala
  const handleRoomIdChange = (e) => {
    setRoomId(e.target.value);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <Head>
        <title>Timbre Dpto - {currentRoom || 'Sin sala'}</title>
        <meta name="description" content="Sistema de timbre para departamento" />
      </Head>
      
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold">Timbre de Departamento</h1>
          <div className="flex items-center mt-2">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className="text-sm">
              {isConnected ? 'Conectado al servidor' : 'Desconectado'}
            </span>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="p-4 md:p-6">
          {/* Estado de conexión */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-center text-blue-800 font-medium">
              {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
            </p>
            {currentRoom && (
              <p className="text-center text-sm text-gray-600 mt-1">
                Sala: {currentRoom}
              </p>
            )}
          </div>

          {/* Botón de timbre */}
          <div className="mb-6 text-center">
            <button
              onClick={handleRing}
              disabled={!isConnected || !currentRoom}
              className={`px-8 py-4 text-xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 ${
                isConnected && currentRoom 
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

          {message && (
            <div className="mb-6 p-3 bg-yellow-100 text-yellow-800 rounded-lg text-center">
              {message}
            </div>
          )}
          
          {/* Botón para volver al inicio */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
          {/* Código QR para compartir */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h2 className="text-lg font-semibold mb-3 text-center">Compartir acceso</h2>
            <div className="flex flex-col items-center">
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <QRCode 
                  value={currentUrl} 
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="mt-3 text-sm text-gray-600 text-center">
                Escanea este código con otro dispositivo para conectar
              </p>
              <div className="mt-3 p-2 bg-gray-50 rounded-lg w-full">
                <p className="text-xs text-gray-500 break-all">{currentUrl}</p>
              </div>
            </div>
          </div>
          
          {/* Registro de eventos */}
          <div className="border-t border-gray-200 pt-6 mt-6">
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
            
            <div className="bg-gray-50 p-3 rounded-md h-48 overflow-y-auto font-mono text-sm">
              {messages.length === 0 ? (
                <div className="text-gray-400 h-full flex items-center justify-center text-center">
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
                      <span>{msg.text}</span>
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
