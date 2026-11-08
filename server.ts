import express from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  DEFAULT_STUDIO_PROJECT,
  buildDeterministicStoryboardFromBrief,
} from "./src/utils/default-project";
import {
  CameraMovementType,
  CharacterAction,
  CreativeBrief,
  EnvironmentType,
  LightingPreset,
  StoryboardScene,
  TransitionType,
  WeatherEffect,
} from "./src/utils/types";

const execFileAsync = promisify(execFile);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "80mb" }));
  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.post("/api/storyboard/generate", async (req, res) => {
    try {
      const { brief, characters } = req.body as {
        brief: CreativeBrief;
        characters?: typeof DEFAULT_STUDIO_PROJECT.characters;
      };

      const charList =
        Array.isArray(characters) && characters.length > 0
          ? characters
          : DEFAULT_STUDIO_PROJECT.characters;

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.trim().length > 0) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `You are a Senior 3D Animation Director creating a scene-by-scene 3D storyboard for a Remotion + Three.js production.
Title: ${brief.title}
Topic: ${brief.topic}
Story Concept: ${brief.storyConcept}
Target Duration: ${brief.targetDurationSeconds} seconds
Visual Style: ${brief.visualStyle}
Characters: ${brief.characterDescriptions || charList.map((c) => `${c.name} (${c.id})`).join(", ")}
Narration: ${brief.narrationScript}

Generate 4 cinematic 3D scenes whose durations sum to approximately ${brief.targetDurationSeconds} seconds.
Available environments: observatory-citadel, bioluminescent-forest, cyber-harbor, desert-monolith, floating-sanctuary, minimal-studio.
Available camera movements: establishing-wide, dolly-in, dolly-out, orbit, tracking, crane-up, close-up, static.
Available lighting presets: golden-hour, moonlit-cobalt, studio-three-point, sunset-dramatic, emerald-mist.
Available weather effects: dust-motes, fireflies, rain, snow, starfield, none.
Available transitions: cut, crossfade, dip-to-black, whip-pan, iris-wipe.
Available character actions: idle, walk, run, talk, gesture, sit.`;

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    durationInSeconds: { type: Type.NUMBER },
                    environment: { type: Type.STRING },
                    cameraMovement: { type: Type.STRING },
                    lightingPreset: { type: Type.STRING },
                    weatherEffect: { type: Type.STRING },
                    narrationText: { type: Type.STRING },
                    soundEffect: { type: Type.STRING },
                    transitionToNext: { type: Type.STRING },
                    primaryAction: { type: Type.STRING },
                  },
                  required: [
                    "title",
                    "durationInSeconds",
                    "environment",
                    "cameraMovement",
                    "lightingPreset",
                    "narrationText",
                  ],
                },
              },
            },
          });

          const rawText = response.text;
          if (rawText) {
            const parsed = JSON.parse(rawText) as Array<
              Record<string, unknown>
            >;
            if (Array.isArray(parsed) && parsed.length > 0) {
              const scenes: StoryboardScene[] = parsed.map((item, idx) => ({
                id: `scene-ai-${idx + 1}`,
                index: idx,
                title: String(item.title || `Scene ${idx + 1}`),
                durationInSeconds: Math.max(
                  3,
                  Math.min(12, Number(item.durationInSeconds) || 4),
                ),
                environment:
                  (item.environment as EnvironmentType) ||
                  "observatory-citadel",
                visualStyleOverride: null,
                cameraMovement:
                  (item.cameraMovement as CameraMovementType) ||
                  "establishing-wide",
                cameraStartPos: [-4.5, 3.2, 8.5],
                cameraEndPos: [-1.8, 2.6, 6.4],
                cameraTarget: [0, 1.4, 0],
                cameraFov: 44,
                depthOfField: 0.3,
                lightingPreset:
                  (item.lightingPreset as LightingPreset) || "golden-hour",
                lightIntensity: 1.35,
                fogDensity: 0.018,
                weatherEffect:
                  (item.weatherEffect as WeatherEffect) || "dust-motes",
                narrationText: String(
                  item.narrationText ||
                    "The deterministic 3D stage awakens in cinematic clarity.",
                ),
                dialogueSpeaker: charList[0]?.name || "Aria Vance",
                soundEffects: [
                  String(item.soundEffect || "Cinematic sub-bass pulse"),
                ],
                transitionToNext:
                  (item.transitionToNext as TransitionType) || "crossfade",
                transitionDurationFrames: 12,
                characters: charList.slice(0, 2).map((c, cIdx) => ({
                  characterId: c.id,
                  startPosition: [
                    cIdx === 0 ? -1.4 : 1.4,
                    0,
                    cIdx === 0 ? 1.2 : 0.6,
                  ],
                  endPosition: [
                    cIdx === 0 ? -0.6 : 1.0,
                    0,
                    cIdx === 0 ? 0.5 : 0.3,
                  ],
                  rotationY: cIdx === 0 ? 0.35 : -0.45,
                  action:
                    ((cIdx === 0
                      ? item.primaryAction
                      : "talk") as CharacterAction) || "walk",
                  expression: "determined",
                  headLookAt: [0, 1.5, 0],
                  speaking: cIdx === 0,
                  dialogueLine: String(
                    item.narrationText ||
                      "The deterministic 3D stage awakens in cinematic clarity.",
                  ),
                })),
              }));

              res.json({ source: "gemini", scenes });
              return;
            }
          }
        } catch {
          // Fall through to deterministic algorithmic synthesis if Gemini API call fails
        }
      }

      const scenes = buildDeterministicStoryboardFromBrief(brief, charList);
      res.json({ source: "deterministic-engine", scenes });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Storyboard generation failed",
      });
    }
  });

  app.post("/api/render/encode-mp4", async (req, res) => {
    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "aetherframe-render-"),
    );

    try {
      const { fps, width, height, frames, wavBase64 } = req.body as {
        fps: number;
        width: number;
        height: number;
        frames: string[];
        wavBase64?: string;
      };

      if (!Array.isArray(frames) || frames.length === 0) {
        res.status(400).send("No frames provided for MP4 encoding.");
        return;
      }

      for (let i = 0; i < frames.length; i++) {
        const dataUrl = frames[i];
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const framePath = path.join(
          tmpDir,
          `frame-${String(i).padStart(5, "0")}.jpg`,
        );
        await fs.promises.writeFile(
          framePath,
          Buffer.from(base64Data, "base64"),
        );
      }

      const audioPath = path.join(tmpDir, "soundtrack.wav");
      const hasAudio = Boolean(wavBase64 && wavBase64.length > 64);
      if (hasAudio && wavBase64) {
        await fs.promises.writeFile(
          audioPath,
          Buffer.from(wavBase64, "base64"),
        );
      }

      const outMp4Path = path.join(tmpDir, "output.mp4");
      const safeWidth = Math.max(320, Math.round((width || 1280) / 2) * 2);
      const safeHeight = Math.max(320, Math.round((height || 720) / 2) * 2);
      const safeFps = fps === 60 ? 60 : 30;

      const ffmpegArgs: string[] = [
        "-y",
        "-framerate",
        String(safeFps),
        "-i",
        path.join(tmpDir, "frame-%05d.jpg"),
      ];

      if (hasAudio) {
        ffmpegArgs.push("-i", audioPath);
      }

      ffmpegArgs.push(
        "-vf",
        `scale=${safeWidth}:${safeHeight}:flags=lanczos`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "21",
        "-pix_fmt",
        "yuv420p",
      );

      if (hasAudio) {
        ffmpegArgs.push("-c:a", "aac", "-b:a", "128k", "-shortest");
      }

      ffmpegArgs.push("-movflags", "+faststart", outMp4Path);

      await execFileAsync("ffmpeg", ffmpegArgs);

      const mp4Buffer = await fs.promises.readFile(outMp4Path);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Length", String(mp4Buffer.length));
      res.send(mp4Buffer);
    } catch (err) {
      res.status(500).send(
        err instanceof Error ? err.message : "FFmpeg MP4 encoding failed",
      );
    } finally {
      fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `AetherFrame 3D Studio Server running on http://0.0.0.0:${PORT}`,
    );
  });
}

startServer();
