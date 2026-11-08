import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "node:path";
import {
  checkVoiceStudioStatus,
  processUploadedDialogueAudio,
  saveCustomVoiceProfile,
  synthesizeSceneSpeechWithOmniVoice,
} from "./src/server/voicestudio-adapter";
import {
  appendRenderChunk,
  cancelRenderJob,
  finalizeRenderJob,
  getRenderJobStatus,
  startRenderJob,
} from "./src/server/render-pipeline";
import { sanitizeOmniVoiceInstruct } from "./src/utils/animation-math";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "250mb" }));
  app.use(
    "/generated-audio",
    express.static(path.resolve("./public/generated-audio")),
  );
  app.use("/renders", express.static(path.resolve("./public/renders")));

  // ---------------------------------------------------------------------------
  // 1. AI Storyboard Generation (Gemini 3.8 Flash + deterministic fallback)
  // ---------------------------------------------------------------------------
  app.post("/api/storyboard/generate", async (req, res) => {
    try {
      const { brief, characters } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          usedAi: false,
          reason: "No GEMINI_API_KEY configured; using deterministic generator",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const prompt = `You are a cinematic 3D animation director and VoiceStudio (k2-fsa/OmniVoice) dialogue supervisor. Generate a 4-scene 3D storyboard JSON for:
Title: ${brief?.title}
Topic: ${brief?.topic}
Concept: ${brief?.storyConcept}
Target Duration: ${brief?.targetDurationSeconds} seconds
Visual Style: ${brief?.visualStyle}
Narration Script: ${brief?.narrationScript}
Available Character IDs: ${(characters || [])
        .map((c: { id: string; name: string }) => `${c.id} (${c.name})`)
        .join(", ")}

Rules:
- Choose environment from: observatory-citadel, bioluminescent-forest, cyber-harbor, desert-monolith, floating-sanctuary, minimal-studio
- Choose cameraMovement from: establishing-wide, dolly-in, dolly-out, orbit, tracking, crane-up, close-up, static
- Choose lightingPreset from: golden-hour, moonlit-cobalt, studio-three-point, sunset-dramatic, emerald-mist
- Choose transitionToNext from: cut, crossfade, dip-to-black, whip-pan, iris-wipe
- Assign expressive dialogueSpeaker ("Nemo", "Leo", "Aria Vance", or "Kaelen-IX") and dialogueVoiceId ("nemo", "leo", "aria", or "kaelen") for each scene.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    durationInSeconds: { type: Type.NUMBER },
                    environment: { type: Type.STRING },
                    cameraMovement: { type: Type.STRING },
                    lightingPreset: { type: Type.STRING },
                    narrationText: { type: Type.STRING },
                    dialogueSpeaker: { type: Type.STRING },
                    dialogueVoiceId: { type: Type.STRING },
                    transitionToNext: { type: Type.STRING },
                  },
                  required: [
                    "title",
                    "durationInSeconds",
                    "environment",
                    "cameraMovement",
                    "lightingPreset",
                    "narrationText",
                    "dialogueSpeaker",
                    "transitionToNext",
                  ],
                },
              },
            },
            required: ["scenes"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ usedAi: true, data: parsed });
    } catch (err) {
      return res.json({
        usedAi: false,
        reason: err instanceof Error ? err.message : "AI generation fallback",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. VoiceStudio & k2-fsa/OmniVoice Integration Endpoints
  // ---------------------------------------------------------------------------
  app.get("/api/voicestudio/status", async (_req, res) => {
    try {
      const status = await checkVoiceStudioStatus();
      return res.json(status);
    } catch (err) {
      return res.status(500).json({
        connected: false,
        errorMessage:
          err instanceof Error ? err.message : "VoiceStudio status error",
      });
    }
  });

  app.post("/api/voicestudio/speech", async (req, res) => {
    try {
      const { sceneId, text, voiceId, language, speed, instruct } = req.body;
      const result = await synthesizeSceneSpeechWithOmniVoice({
        sceneId: sceneId || "scene",
        text: text || "",
        voiceId: voiceId || "nemo",
        language: language || "en",
        speed: Number(speed) || 1.0,
        instruct: instruct || "",
      });
      return res.json(result);
    } catch (err) {
      return res.status(503).json({
        error:
          err instanceof Error
            ? err.message
            : "OmniVoice speech generation failed",
      });
    }
  });

  app.post("/api/voicestudio/upload-dialogue", async (req, res) => {
    try {
      const { sceneId, text, voiceId, language, audioBase64, fileName } =
        req.body;
      if (!audioBase64) {
        return res
          .status(400)
          .json({ error: "Missing audioBase64 payload for uploaded dialogue." });
      }
      const result = await processUploadedDialogueAudio({
        sceneId: sceneId || "scene",
        text: text || "",
        voiceId: voiceId || "uploaded",
        language: language || "en",
        audioBase64,
        fileName: fileName || "dialogue.wav",
      });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to process uploaded dialogue audio.",
      });
    }
  });

  app.post("/api/voicestudio/profiles", async (req, res) => {
    try {
      const {
        voiceId,
        name,
        gender,
        age,
        pitch,
        style,
        accent,
        language,
        speed,
        description,
        consentConfirmed,
      } = req.body;

      if (!name || !voiceId) {
        return res
          .status(400)
          .json({ error: "Profile name and voiceId are required." });
      }
      if (consentConfirmed !== true) {
        return res.status(400).json({
          error:
            "Speaker authorization & consent confirmation is required to register a custom voice profile.",
        });
      }

      const rawTags = [
        gender,
        age,
        pitch,
        style !== "none" ? style : "",
        accent !== "none" ? accent : "",
      ]
        .filter(Boolean)
        .join(", ");

      const instruct = sanitizeOmniVoiceInstruct(rawTags);
      const updatedProfiles = saveCustomVoiceProfile({
        voiceId: String(voiceId)
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "-"),
        name: String(name).trim(),
        engine: "omnivoice",
        gender: gender || "female",
        age: age || "young adult",
        pitch: pitch || "moderate pitch",
        style: style || "none",
        accent: accent || "american accent",
        language: language || "auto",
        speed: Number(speed) || 1.0,
        instruct,
        description: description || "Custom OmniVoice character profile",
        isCustomProfile: true,
        consentConfirmed: true,
      });

      return res.json({ profiles: updatedProfiles });
    } catch (err) {
      return res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to save voice profile.",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Stateful Chunked Production MP4 Render Pipeline + Verification
  // ---------------------------------------------------------------------------
  app.post("/api/render/jobs/start", (req, res) => {
    try {
      const { projectName, fps, width, height, totalFrames, frameExtension } =
        req.body;
      const status = startRenderJob({
        projectName: projectName || "AetherFrame-Render",
        fps: Number(fps) || 30,
        width: Number(width) || 1920,
        height: Number(height) || 1080,
        totalFrames: Number(totalFrames) || 300,
        frameExtension: frameExtension === "png" ? "png" : "jpg",
      });
      return res.json(status);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to start render job",
      });
    }
  });

  app.post("/api/render/jobs/:jobId/chunk", (req, res) => {
    try {
      const { jobId } = req.params;
      const { startFrameIndex, frames } = req.body;
      if (!Array.isArray(frames) || frames.length === 0) {
        return res.status(400).json({ error: "No frames in chunk" });
      }
      const status = appendRenderChunk({
        jobId,
        startFrameIndex: Number(startFrameIndex) || 0,
        frames,
      });
      return res.json(status);
    } catch (err) {
      return res.status(400).json({
        error:
          err instanceof Error ? err.message : "Failed to append frame chunk",
      });
    }
  });

  app.post("/api/render/jobs/:jobId/finalize", async (req, res) => {
    try {
      const { jobId } = req.params;
      const { audioWavBase64 } = req.body;
      if (!audioWavBase64) {
        return res
          .status(400)
          .json({ error: "Missing audioWavBase64 for MP4 finalization" });
      }
      const status = await finalizeRenderJob({
        jobId,
        audioWavBase64,
      });
      return res.json(status);
    } catch (err) {
      return res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to finalize MP4 render",
      });
    }
  });

  app.post("/api/render/jobs/:jobId/cancel", (req, res) => {
    const status = cancelRenderJob(req.params.jobId);
    if (!status) {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.json(status);
  });

  app.get("/api/render/jobs/:jobId/status", (req, res) => {
    const status = getRenderJobStatus(req.params.jobId);
    if (!status) {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.json(status);
  });

  // Legacy single-request MP4 endpoint preserved and upgraded to use the verified pipeline
  app.post("/api/render/mp4", async (req, res) => {
    try {
      const { frames, audioWavBase64, fps = 30, width = 1920, height = 1080 } =
        req.body;
      if (!Array.isArray(frames) || frames.length === 0 || !audioWavBase64) {
        return res
          .status(400)
          .json({ error: "Missing frames or audioWavBase64" });
      }

      const job = startRenderJob({
        projectName: "Direct-MP4-Render",
        fps: Number(fps),
        width: Number(width),
        height: Number(height),
        totalFrames: frames.length,
      });
      appendRenderChunk({
        jobId: job.jobId,
        startFrameIndex: 0,
        frames,
      });
      const finalized = await finalizeRenderJob({
        jobId: job.jobId,
        audioWavBase64,
      });
      return res.json(finalized);
    } catch (err) {
      return res.status(500).json({
        error:
          err instanceof Error ? err.message : "FFmpeg MP4 encoding failed",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AetherFrame 3D Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
