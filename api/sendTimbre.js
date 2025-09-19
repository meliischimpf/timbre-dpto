// api/sendTimbre.js
import admin from "firebase-admin";

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const message = {
      token: process.env.DEVICE_TOKEN, // token del dispositivo al que querés mandar el aviso
      notification: {
        title: "🚪 Timbre",
        body: "¡Alguien tocó el timbre!",
      },
    };

    await admin.messaging().send(message);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error enviando notificación:", error);
    return res.status(500).json({ error: "Error enviando notificación" });
  }
}