# Timbre Inteligente con QR

Una aplicación web que permite activar un timbre virtual mediante un código QR, enviando notificaciones push a dispositivos móviles.

## Características

- Genera un código QR para activar el timbre
- Escanea códigos QR desde la cámara del dispositivo
- Envía notificaciones push a dispositivos Android
- Interfaz web responsiva
- Fácil de desplegar en Vercel

## Requisitos Previos

- Node.js 14.x o superior
- Cuenta de Firebase
- Cuenta en Vercel (para despliegue)

## Configuración del Proyecto

1. Clona el repositorio:
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd timbre-dpto
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura Firebase:
   - Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com/)
   - Genera un archivo de credenciales de servicio (service-account.json)
   - Activa Firebase Cloud Messaging (FCM) en tu proyecto
   - Registra una aplicación Android y obtén el token del dispositivo

4. Configura las variables de entorno:
   Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}  # Contenido de tu service-account.json
   DEVICE_TOKEN=tu_token_de_dispositivo
   ```

## Desarrollo

Para ejecutar el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Despliegue en Vercel

1. Instala la CLI de Vercel si no la tienes:
   ```bash
   npm install -g vercel
   ```

2. Inicia sesión en Vercel:
   ```bash
   vercel login
   ```

3. Configura las variables de entorno en Vercel:
   - Ve al panel de control de tu proyecto en Vercel
   - Ve a Settings > Environment Variables
   - Agrega las mismas variables que en tu archivo `.env.local`

4. Despliega la aplicación:
   ```bash
   vercel --prod
   ```

## Uso

1. Abre la aplicación en tu navegador o escanea el código QR desde un dispositivo móvil
2. Para activar el timbre, presiona el botón "Tocar Timbre" o escanea el código QR
3. Recibirás una notificación push en tu dispositivo Android

## Configuración de Notificaciones Push (Android)

1. Asegúrate de que tu aplicación Android esté configurada correctamente con FCM
2. Obtén el token del dispositivo y configúralo en las variables de entorno
3. Configura un canal de notificaciones con el ID `doorbell_channel` en tu aplicación Android

## Solución de Problemas

- **Error al enviar notificaciones**: Verifica que el token del dispositivo sea válido y que el servicio de mensajería de Firebase esté habilitado.
- **Problemas con el sonido**: Asegúrate de que tu navegador tenga permisos para reproducir sonidos.
- **Error de CORS**: Verifica que las URLs permitidas estén configuradas correctamente en Firebase Console.

## Licencia

Este proyecto está bajo la Licencia MIT.
