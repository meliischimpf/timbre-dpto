import { createElement, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import '../styles/globals.css';

// Variable global para mantener la instancia del socket
let socket;

function MyApp({ Component, pageProps }) {
  const [isConnected, setIsConnected] = useState(false);

  // Función para reproducir sonido de timbre
  const playDoorbellSound = useCallback(() => {
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
      console.error('🔇 [Client] Error al reproducir sonido:', error);
    }
  }, []);

  useEffect(() => {
    // Solo se ejecuta en el cliente
    if (typeof window === 'undefined') return;

    // Cerrar el socket existente si hay uno
    if (socket) {
      console.log('🔄 [Client] Reiniciando conexión WebSocket...');
      socket.disconnect();
      socket = null;
    }
    
    console.log('🔌 [Client] Inicializando conexión WebSocket...');
    
    // Crear una nueva instancia de socket (URL explícita y polling primero)
    const baseUrl = window.location.origin;
    socket = io(baseUrl, {
      path: '/api/socket',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      withCredentials: true
    });
    
    // Guardar la instancia del socket globalmente para depuración
    window.socket = socket;

    // Manejadores de eventos
    const onConnect = () => {
      console.log('✅ [Client] Conectado al servidor WebSocket');
      setIsConnected(true);
      
      // Unirse a una sala después de conectarse
      const deviceId = localStorage.getItem('deviceId') || `device-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
      
      socket.emit('unirse-sala', deviceId, (response) => {
        console.log('📝 [Client] Respuesta de unirse-sala:', response);
      });
    };

    const onDisconnect = (reason) => {
      console.log('❌ [Client] Desconectado del servidor WebSocket:', reason);
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.error('❌ [Client] Error de conexión WebSocket:', error);
      setIsConnected(false);
      
      // Intentar reconexión después de un retraso
      setTimeout(() => {
        console.log('🔄 [Client] Intentando reconectar...');
        socket.connect();
      }, 1000);
    };

    const onWelcome = (data) => {
      console.log('👋 [Client] Mensaje de bienvenida:', data);
    };

    const onTimbre = (data) => {
      console.log('🔔 [Client] ¡Timbre recibido!', data);
      playDoorbellSound();
    };

    // Configurar listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('welcome', onWelcome);
    socket.on('timbre', onTimbre);

    // Limpiar al desmontar
    return () => {
      if (socket) {
        console.log('🔌 [Client] Desconectando WebSocket...');
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError);
        socket.off('welcome', onWelcome);
        socket.off('timbre', onTimbre);
        socket.disconnect();
        socket = null;
      }
    };
  }, [playDoorbellSound]);

  // Pasar el estado de conexión como prop a todas las páginas
  const enhancedPageProps = {
    ...pageProps,
    isSocketConnected: isConnected,
    socket: socket
  };

  return createElement(Component, enhancedPageProps);
}

export default MyApp;
