import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// In this environment, we can usually initialize without explicit credentials if running in Cloud Run
// or we can use the environment variables from firebase-applet-config.json
try {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
  });
} catch (e) {
  console.error("Firebase Admin init failed:", e);
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Webhook for WhatsApp Sync
  // Expected body: { content: string, secret: string }
  app.post("/api/announcements/webhook", async (req, res) => {
    const { content, secret } = req.body;

    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content required" });
    }

    try {
      await db.collection("announcements").add({
        content,
        author: "WhatsApp Bot",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "whatsapp"
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Failed to post announcement" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
