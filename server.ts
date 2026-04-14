import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

console.log("Starting server.ts...");

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

  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set in environment variables.");
  } else {
    console.log("GEMINI_API_KEY is configured.");
  }

  app.use(express.json());

  // Test Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is healthy" });
  });

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

  // AI Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    console.log("Received AI Chat request:", req.body);
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API Key not configured on server." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      
      const systemPrompt = `You are "Mr Ballu", an ultra-advanced AI tutor for PM SHRI Kendriya Vidyalaya Bawana. 
      You are an expert in Physics, Chemistry, Mathematics, and Computer Science.
      Your goal is to solve advanced problems step-by-step and generate high-quality code for CS subjects.
      
      Guidelines:
      1. Be polite, encouraging, and highly intellectual.
      2. For STEM subjects, provide clear explanations and formulas.
      3. For Computer Science, provide clean, well-commented code in the requested language (Python, C++, Java, etc.).
      4. Use Markdown for formatting (bolding, lists, code blocks).
      5. If a student asks something outside your expertise, politely redirect them to their studies but try to be helpful.
      6. Mention "PM SHRI KV Bawana" occasionally to show school spirit.
      
      Always respond as Mr Ballu.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          ...history.map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });
      
      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: "Failed to generate AI response." });
    }
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
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
