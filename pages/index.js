const { useState, useRef, useEffect } = require("react");
const Head = require("next/head").default;
const QRCode = require("qrcode.react").default;
const { BrowserQRCodeReader } = require("@zxing/library");
const { io } = require("socket.io-client");
const { playDoorbell } = require("../utils/doorbell");

// No necesitamos dynamic import ya que usaremos @zxing/browser directamente

// ID único para este dispositivo
const generateDeviceId = () => {
  // Solo intentar acceder a localStorage en el cliente
  if (typeof window === 'undefined') {
    return 'device-temp-' + Math.random().toString(36).substr(2, 9);
  }
  
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const socketRef = useRef(null);

  // Referencia para el lector de QR
  const qrReaderRef = useRef(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // Inicializar WebSocket cuando el componente se monta
  useEffect(() => {
    // Generar o recuperar el ID del dispositivo
    const id = generateDeviceId();
    setDeviceId(id);

    // Inicializar conexión WebSocket
    console.log('Inicializando conexión WebSocket...');
    socketRef.current = io({
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      withCredentials: true
    });

    // Inicializar el lector de QR
    codeReaderRef.current = new BrowserQRCodeReader();

    // Manejar eventos de conexión
    socketRef.current.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket');
      setIsConnected(true);
      
      // Unirse a la sala con el ID del dispositivo
      console.log(`Intentando unirse a la sala: ${id}`);
      socketRef.current.emit('unirse-sala', id, (response) => {
        console.log('Respuesta del servidor:', response);
      });
    });

    // Escuchar confirmación de unión a sala
    socketRef.current.on('sala-unida', (data) => {
      console.log(`✅ Unido a la sala: ${data.salaId}`, data);
    });

    // Escuchar eventos de timbre
    socketRef.current.on('timbre', (data) => {
      console.log('🔔 ¡Evento de timbre recibido!', data);
      playBellSound();
    });

    // Manejar errores de conexión
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      setIsConnected(false);
    });

    // Manejar reconexión
    socketRef.current.on('reconnect', (attempt) => {
      console.log(`♻️ Reconectado al servidor (intento ${attempt})`);
      setIsConnected(true);
    });

    // Manejar desconexión
    socketRef.current.on('disconnect', (reason) => {
      console.log(`❌ Desconectado del servidor WebSocket: ${reason}`);
      setIsConnected(false);
    });

    // Limpiar al desmontar
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Iniciar el escaneo de QR
  const startQRScan = async () => {
    try {
      if (!videoRef.current) return;
      
      // Configurar el lector de QR
      const videoElement = videoRef.current;
      const codeReader = new BrowserQRCodeReader();
      
      // Obtener la cámara
      const videoInputDevices = await codeReader.listVideoInputDevices();
      const deviceId = videoInputDevices[0]?.deviceId;
      
      // Iniciar la cámara y el escaneo
      codeReader.decodeFromVideoDevice(
        deviceId || undefined,
        videoElement,
        (result, error) => {
          if (result) {
            console.log('Código QR escaneado:', result.getText());
            setIsScanning(false);
            ringDoorbell(result.getText());
          }
          
          if (error && !(error.message?.includes('No QR code found'))) {
            console.error('Error al escanear QR:', error);
          }
        }
      );
      
      // Guardar la instancia para poder limpiarla después
      codeReaderRef.current = codeReader;
      
    } catch (error) {
      console.error('Error al iniciar el escáner de QR:', error);
    }
  };
  
  // Detener el escaneo de QR
  const stopQRScan = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  };
  
  // Manejar el cambio de estado del escáner
  useEffect(() => {
    if (isScanning) {
      startQRScan();
    } else {
      stopQRScan();
    }
    
    return () => {
      stopQRScan();
    };
  }, [isScanning]);

  const playBellSound = () => {
    setIsRinging(true);
    // Reproducir el sonido del timbre usando Web Audio API
    playDoorbell();
    
    // Restablecer el estado después de 3 segundos
    setTimeout(() => {
      setIsRinging(false);
    }, 3000);
  };

  const ringDoorbell = async (targetDeviceId) => {
    try {
      const response = await fetch('/api/sendTimbre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salaId: targetDeviceId || deviceId,
        }),
      });
      
      const data = await response.json();
      console.log('Respuesta del timbre:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al activar el timbre');
      }
      
      // Reproducir sonido localmente también
      playBellSound();
      
      return data;
    } catch (error) {
      console.error('Error al activar el timbre:', error);
      alert(`Error: ${error.message}`);
      throw error;
    }
  };

  const toggleScanner = () => {
    if (isScanning) {
      stopQRScan();
    } else {
      setShowQR(false);
      // Pequeño retraso para asegurar que el video esté listo
      setTimeout(() => {
        setIsScanning(true);
      }, 100);
    }
  };

  const toggleQR = () => {
    setShowQR(!showQR);
    setIsScanning(false);
  };

  // URL del timbre con el ID del dispositivo
  const [doorbellUrl, setDoorbellUrl] = useState('');
  
  useEffect(() => {
    // Este código solo se ejecuta en el cliente
    setDoorbellUrl(`${window.location.origin}?deviceId=${encodeURIComponent(deviceId)}`);
  }, [deviceId]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Timbre Inteligente</title>
        <meta name="description" content="Sistema de timbre con notificaciones en tiempo real" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">🔔 Timbre Inteligente</h1>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
               title={isConnected ? 'Conectado' : 'Desconectado'} />
        </div>
        
        <div className="space-y-6">
          <div className="text-center">
            <button
              onClick={() => ringDoorbell(deviceId)}
              disabled={isRinging || !isConnected}
              className={`px-6 py-3 rounded-lg text-white font-semibold w-full transition-colors ${
                isRinging 
                  ? 'bg-yellow-500 cursor-not-allowed' 
                  : !isConnected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRinging ? 'Sonando...' : isConnected ? 'Probar Timbre' : 'Conectando...'}
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={toggleScanner}
              disabled={!isConnected}
              className={`w-full py-2 px-4 border rounded-md ${
                isConnected 
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50' 
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isScanning ? 'Detener Escáner' : 'Escanear QR'}
            </button>
            
            <button
              onClick={toggleQR}
              disabled={!isConnected}
              className={`w-full py-2 px-4 border rounded-md ${
                isConnected 
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50' 
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {showQR ? 'Ocultar Mi Código QR' : 'Mostrar Mi Código QR'}
            </button>
          </div>

          {isScanning && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="text-center mb-2">Escanea el código QR del timbre</p>
              <div className="relative w-full h-64 bg-black rounded-md overflow-hidden">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-4 border-blue-500 rounded-md pointer-events-none" />
              </div>
              <button
                onClick={() => setIsScanning(false)}
                className="mt-4 w-full py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Detener escaneo
              </button>
            </div>
          )}

          {showQR && (
            <div className="mt-4 p-4 border rounded-lg flex flex-col items-center">
              <p className="mb-3 text-center">Escanee este código para activar el timbre</p>
              <div className="p-2 bg-white rounded border">
                <QRCode value={doorbellUrl} size={200} />
              </div>
              <p className="mt-3 text-sm text-gray-600 text-center">
                ID de tu dispositivo: <span className="font-mono text-xs break-all">{deviceId}</span>
              </p>
              <p className="mt-2 text-xs text-gray-500 text-center">
                Comparte este enlace: <span className="font-mono text-xs break-all">{doorbellUrl}</span>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Timbre Inteligente - {new Date().getFullYear()}</p>
      </footer>
      
      {/* Estilos */}
      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
            Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
