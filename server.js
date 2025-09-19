// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocket } = require('./lib/socket');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Inicializar la aplicación Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Crear un servidor HTTP
  const server = createServer(async (req, res) => {
    try {
      // Parsear la URL
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Manejar las rutas de la API
      if (pathname.startsWith('/api')) {
        if (pathname === '/api/socket') {
          // Manejar la ruta del socket
          if (!res.socket.server.io) {
            console.log('Inicializando WebSocket...');
            initSocket(server);
          }
          res.end();
          return;
        }
      }

      // Para todas las demás rutas, dejar que Next.js las maneje
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error en el servidor:', err);
      res.statusCode = 500;
      res.end('Error interno del servidor');
    }
  });

  // Inicializar el servidor WebSocket
  initSocket(server);

  // Iniciar el servidor
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Servidor listo en http://${hostname}:${port}`);
  });

  // Manejar cierre limpio
  process.on('SIGTERM', () => {
    console.log('Cerrando servidor...');
    server.close(() => {
      console.log('Servidor cerrado');
      process.exit(0);
    });
  });
});
