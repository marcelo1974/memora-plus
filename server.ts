import express from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Generate Questions endpoint
app.post("/api/ai/generate-questions", async (req, res) => {
  try {
    const { subject, topic, count = 5, difficulty = "Médio" } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY não configurada no servidor. Configure a chave nas configurações do AI Studio para habilitar a geração em tempo real.",
      });
    }

    const prompt = `Gere exatamente ${count} questões de múltipla escolha para concurso/estudo no padrão MEMORA+.
Matéria: ${subject || "Conhecimentos Gerais"}
Assunto: ${topic || "Geral"}
Dificuldade: ${difficulty}

Para cada questão:
- Uma pergunta clara, contextualizada e rigorosa em Português (Brasil).
- 4 alternativas distintas: A, B, C, D (não coloque "A)", apenas o texto da opção).
- A indicação exata da resposta correta ("A", "B", "C" ou "D").
- Uma explicação pedagógica profunda e detalhada justificando a correta e comentando por que as outras estão erradas.
- Matéria e Assunto correspondentes.
- Dificuldade indicada ("Fácil", "Médio" ou "Difícil").
- Tempo sugerido em segundos (ex: 60, 90, 120).
- 2 a 3 tags temáticas.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é um especialista em bancas de concursos públicos, vestibulares e neurociência da memorização da plataforma MEMORA+. Suas questões são didáticas, precisas e com explicações aprofundadas.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de questões geradas",
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "Texto da pergunta" },
              optionA: { type: Type.STRING, description: "Texto da alternativa A" },
              optionB: { type: Type.STRING, description: "Texto da alternativa B" },
              optionC: { type: Type.STRING, description: "Texto da alternativa C" },
              optionD: { type: Type.STRING, description: "Texto da alternativa D" },
              correctOption: { type: Type.STRING, description: "Letra da resposta correta: A, B, C ou D" },
              explanation: { type: Type.STRING, description: "Explicação pedagógica completa" },
              subject: { type: Type.STRING, description: "Matéria" },
              topic: { type: Type.STRING, description: "Assunto específico" },
              difficulty: { type: Type.STRING, description: "Fácil, Médio ou Difícil" },
              estimatedTime: { type: Type.INTEGER, description: "Tempo estimado em segundos" },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Palavras-chave da questão",
              },
            },
            required: ["question", "optionA", "optionB", "optionC", "optionD", "correctOption", "explanation", "subject", "topic", "difficulty"],
          },
        },
      },
    });

    const text = response.text?.trim() || "[]";
    const questions = JSON.parse(text);
    return res.json({ success: true, questions });
  } catch (err: any) {
    console.error("Erro ao gerar questões com Gemini:", err);
    return res.status(500).json({
      error: "Falha ao gerar questões com Inteligência Artificial.",
      details: err?.message || String(err),
    });
  }
});

// AI Text to Questions endpoint
app.post("/api/ai/text-to-questions", async (req, res) => {
  try {
    const { text, count = 3, subject = "Geral", topic = "Material de Estudo" } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return res.status(400).json({ error: "Texto insuficiente para análise." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY não configurada no servidor.",
      });
    }

    const prompt = `Analise atentamente o texto a seguir, extraia os conceitos centrais e gere exatamente ${count} questões de múltipla escolha com 4 alternativas (A, B, C, D), resposta correta e explicação detalhada com base exclusiva ou referenciada no texto fornecido:

---
${text.slice(0, 8000)}
---`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é o assistente pedagógico MEMORA+. Extraia conceitos-chave e crie questões de memorização e fixação de alta qualidade.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              optionA: { type: Type.STRING },
              optionB: { type: Type.STRING },
              optionC: { type: Type.STRING },
              optionD: { type: Type.STRING },
              correctOption: { type: Type.STRING },
              explanation: { type: Type.STRING },
              subject: { type: Type.STRING },
              topic: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              estimatedTime: { type: Type.INTEGER },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["question", "optionA", "optionB", "optionC", "optionD", "correctOption", "explanation"],
          },
        },
      },
    });

    const resText = response.text?.trim() || "[]";
    const questions = JSON.parse(resText);
    return res.json({ success: true, questions });
  } catch (err: any) {
    console.error("Erro no text-to-questions:", err);
    return res.status(500).json({
      error: "Falha na conversão de texto em questões.",
      details: err?.message || String(err),
    });
  }
});

// Upload and Process Client's Exact Original Logo
app.post("/api/upload-client-logo", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma imagem fornecida." });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], "base64") : Buffer.from(imageBase64, "base64");

    const publicDir = path.join(process.cwd(), "public");

    // 1. Save original client file unaltered
    fs.writeFileSync(path.join(publicDir, "logo-client.png"), buffer);
    fs.writeFileSync(path.join(publicDir, "logo-official.png"), buffer);

    // 2. Generate circular / medallion version
    const circleSvg = Buffer.from(
      '<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="#fff" /></svg>'
    );
    await sharp(buffer)
      .resize(512, 512, { fit: "cover" })
      .composite([{ input: circleSvg, blend: "dest-in" }])
      .png()
      .toFile(path.join(publicDir, "logo-round.png"));

    // 3. PWA Icons
    await sharp(buffer).resize(192, 192, { fit: "cover" }).png().toFile(path.join(publicDir, "pwa-192x192.png"));
    await sharp(buffer).resize(192, 192, { fit: "cover" }).png().toFile(path.join(publicDir, "icon-192.png"));
    await sharp(buffer).resize(512, 512, { fit: "cover" }).png().toFile(path.join(publicDir, "pwa-512x512.png"));
    await sharp(buffer).resize(512, 512, { fit: "cover" }).png().toFile(path.join(publicDir, "icon-512.png"));
    await sharp(buffer).resize(180, 180, { fit: "cover" }).png().toFile(path.join(publicDir, "apple-touch-icon.png"));

    const paddedSize = Math.round(512 * 0.76);
    const resizedForMask = await sharp(buffer).resize(paddedSize, paddedSize, { fit: "cover" }).toBuffer();
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 11, g: 15, b: 25, alpha: 1 },
      },
    })
      .composite([{ input: resizedForMask, gravity: "center" }])
      .png()
      .toFile(path.join(publicDir, "pwa-maskable-512x512.png"));

    console.log("Original client logo processed and saved into public!");
    return res.json({ success: true, url: "/logo-client.png?t=" + Date.now() });
  } catch (err: any) {
    console.error("Erro ao processar logotipo original do cliente:", err);
    return res.status(500).json({ error: "Falha ao salvar e processar o logo do cliente.", details: err?.message });
  }
});

// Explicit PWA Service Worker & Workbox handler (operates seamlessly in dev and prod)
app.get("/sw.js", (_req, res) => {
  const swDist = path.join(process.cwd(), "dist", "sw.js");
  if (fs.existsSync(swDist)) {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.sendFile(swDist);
  }
  return res.status(404).send("sw.js not generated yet. Run npm run build.");
});

app.get(/^\/workbox-[a-zA-Z0-9_-]+\.js$/, (req, res) => {
  const fileName = path.basename(req.path);
  const wbDist = path.join(process.cwd(), "dist", fileName);
  if (fs.existsSync(wbDist)) {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(wbDist);
  }
  return res.status(404).send("Workbox library file not found.");
});

app.get(["/manifest.json", "/manifest.webmanifest"], (_req, res) => {
  const distManifest = path.join(process.cwd(), "dist", "manifest.webmanifest");
  const pubManifest = path.join(process.cwd(), "public", "manifest.json");
  const target = fs.existsSync(distManifest) ? distManifest : pubManifest;
  if (fs.existsSync(target)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=UTF-8");
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(target);
  }
  return res.status(404).send("manifest not found");
});

// Explicit compiled /assets static route: Always serves production JS & CSS directly
const distAssetsDir = path.join(process.cwd(), "dist", "assets");
app.use(
  "/assets",
  express.static(distAssetsDir, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
        res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
        res.setHeader("X-Content-Type-Options", "nosniff");
      } else if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=UTF-8");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    },
  })
);

// Fallback protection: Never return HTML for missing /assets/*.js or /assets/*.css
app.use("/assets", (req, res, next) => {
  if (req.path.endsWith(".js") || req.path.endsWith(".css")) {
    return res.status(404).type("text/plain").send("Asset not found");
  }
  next();
});

// Explicit production index.html serving for precache requests
app.get("/index.html", (req, res, next) => {
  const distIndex = path.join(process.cwd(), "dist", "index.html");
  if (fs.existsSync(distIndex)) {
    res.setHeader("Content-Type", "text/html; charset=UTF-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.sendFile(distIndex);
  }
  next();
});

// Vite middleware & Static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("sw.js")) {
            res.setHeader("Service-Worker-Allowed", "/");
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
          } else if (filePath.includes("workbox-")) {
            res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith(".webmanifest") || filePath.endsWith("manifest.json")) {
            res.setHeader("Content-Type", "application/manifest+json; charset=UTF-8");
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MEMORA+ Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
