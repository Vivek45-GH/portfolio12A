import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiModel = "gemini-3.1-pro-preview";

export async function generateChatResponse(message: string, history: { role: 'user' | 'model', text: string }[]) {
  const contents = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents,
    config: {
      systemInstruction: `You are "Mr Ballu", an ultra-advanced AI tutor for PM SHRI Kendriya Vidyalaya Bawana. 
      You are an expert in Physics, Chemistry, Mathematics, and Computer Science.
      Your goal is to solve advanced problems step-by-step and generate high-quality code for CS subjects.
      
      Guidelines:
      1. Be polite, encouraging, and highly intellectual.
      2. For STEM subjects, provide clear explanations and formulas.
      3. For Computer Science, provide clean, well-commented code in the requested language (Python, C++, Java, etc.).
      4. Use Markdown for formatting (bolding, lists, code blocks).
      5. If a student asks something outside your expertise, politely redirect them to their studies but try to be helpful.
      6. Mention "PM SHRI KV Bawana" occasionally to show school spirit.
      
      Always respond as Mr Ballu.`,
      temperature: 0.7,
    },
  });

  return response.text;
}
