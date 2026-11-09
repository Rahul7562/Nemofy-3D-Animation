import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { BUILT_IN_VOICE_PROFILES } from "../assets/preset-library";

const execFileAsync = promisify(execFile);

const MODELS_DIR = path.resolve("./data/voicestudio/models");
const LEO_ONNX_PATH = path.join(MODELS_DIR, "leo.onnx");
const NEMO_ONNX_PATH = path.join(MODELS_DIR, "nemo.onnx");

function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

/**
 * Selects the best neural ONNX voice model & prosody parameters based on
 * character voiceId, language, and OmniVoice instruct tags.
 */
function selectVoiceConfig(
  voiceId: string,
  language: string,
  instruct: string,
): {
  onnxModelPath: string | null;
  pitchShiftSemitones: number;
  fliteVoice: "slt" | "rms" | "kal16" | "awb";
  espeakVoice: string;
} {
  const v = (voiceId || "").toLowerCase();
  const inst = (instruct || "").toLowerCase();
  const lang = (language || "en").toLowerCase();

  const isNemoOrAria =
    v.includes("nemo") ||
    v.includes("aria") ||
    v.includes("slt") ||
    (inst.includes("female") && !inst.includes("male"));

  let onnxModelPath: string | null = null;
  if (lang === "en" || lang === "auto" || lang.startsWith("en-")) {
    if (isNemoOrAria && fs.existsSync(NEMO_ONNX_PATH)) {
      onnxModelPath = NEMO_ONNX_PATH;
    } else if (fs.existsSync(LEO_ONNX_PATH)) {
      onnxModelPath = LEO_ONNX_PATH;
    } else if (fs.existsSync(NEMO_ONNX_PATH)) {
      onnxModelPath = NEMO_ONNX_PATH;
    }
  }

  // Keep native ONNX neural formant pitch (0 semitone shift) for Leo and Nemo so voices never sound pitchy or cranky
  let pitchShiftSemitones = 0;
  if (v.includes("kaelen") || inst.includes("low pitch")) {
    pitchShiftSemitones = -1.2;
  }

  const fliteVoice: "slt" | "rms" | "kal16" | "awb" = isNemoOrAria
    ? "slt"
    : "rms";
  const langBase = lang === "auto" ? "en" : lang.split("-")[0];
  const espeakVoice = isNemoOrAria ? `${langBase}+f3` : `${langBase}+m3`;

  return {
    onnxModelPath,
    pitchShiftSemitones,
    fliteVoice,
    espeakVoice,
  };
}

/**
 * Starts a local OpenAI-compatible VoiceStudio (k2-fsa/OmniVoice contract) service on
 * port 3900 powered by local Neural VITS ONNX speech synthesis (Piper ONNX).
 */
export async function ensureLocalVoiceStudioService(
  port = 3900,
): Promise<void> {
  const alreadyRunning = await isPortListening(port);
  if (alreadyRunning) {
    return;
  }

  const vApp = express();
  vApp.use(express.json({ limit: "25mb" }));

  vApp.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "VoiceStudio",
      engine: "omnivoice",
      mode:
        fs.existsSync(LEO_ONNX_PATH) && fs.existsSync(NEMO_ONNX_PATH)
          ? "neural-vits-onnx"
          : "local-cpu-synthesizer",
    });
  });

  vApp.get("/v1/audio/voices", (_req, res) => {
    res.json({
      engines: [{ id: "omnivoice", loaded: true }],
      voices: BUILT_IN_VOICE_PROFILES.map((p) => ({
        id: p.voiceId,
        voice_id: p.voiceId,
        name: p.name,
        language: p.language,
        instruct: p.instruct,
      })),
    });
  });

  vApp.post("/v1/audio/speech", async (req, res) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vs-synth-"));
    const rawWav = path.join(tmpDir, "raw.wav");
    const outWav = path.join(tmpDir, "out.wav");

    try {
      const {
        input = "",
        voice = "nemo",
        language = "en",
        speed = 1.0,
        instruct = "",
        raw_instruct = "",
      } = req.body || {};

      const text = String(input || "").trim();
      if (!text) {
        return res.status(400).json({ error: "Missing input text" });
      }

      const cfg = selectVoiceConfig(
        String(voice),
        String(language),
        String(raw_instruct || instruct),
      );
      const numericSpeed = Math.max(0.75, Math.min(1.45, Number(speed) || 1.0));

      let synthesizedWithNeural = false;
      let sourceSampleRate = 22050;

      if (cfg.onnxModelPath) {
        try {
          const instLower = String(raw_instruct || instruct || "").toLowerCase();
          // Emotion-aware neural prosody tuning for comedic timing, emotional warmth, and crisp articulation
          let baseScale = 0.92;
          let noiseScale = 0.50;
          let noiseW = 0.65;
          let sentenceSilence = "0.14";

          if (instLower.includes("panic") || instLower.includes("urgent") || instLower.includes("stunned")) {
            baseScale = 0.88;
            noiseScale = 0.58;
            noiseW = 0.70;
            sentenceSilence = "0.12";
          } else if (instLower.includes("relief") || instLower.includes("grateful") || instLower.includes("emotional")) {
            baseScale = 0.96;
            noiseScale = 0.48;
            noiseW = 0.60;
            sentenceSilence = "0.18";
          } else if (instLower.includes("witty") || instLower.includes("confident") || instLower.includes("triumphant") || instLower.includes("heroic")) {
            baseScale = 0.90;
            noiseScale = 0.54;
            noiseW = 0.66;
            sentenceSilence = "0.14";
          }

          const lengthScale = Math.max(0.72, Math.min(1.16, baseScale / numericSpeed));
          await new Promise<void>((resolve, reject) => {
            const args = [
              "--model",
              cfg.onnxModelPath!,
              "--output_file",
              rawWav,
              "--length_scale",
              lengthScale.toFixed(3),
              "--noise_scale",
              noiseScale.toFixed(3),
              "--noise_w",
              noiseW.toFixed(3),
              "--sentence_silence",
              sentenceSilence,
            ];
            const child = spawn("piper", args, {
              stdio: ["pipe", "pipe", "pipe"],
            });
            let stderr = "";
            child.stderr.on("data", (chunk) => {
              stderr += String(chunk);
            });
            child.on("error", (err) => reject(err));
            child.on("close", (code) => {
              if (code === 0 && fs.existsSync(rawWav)) {
                resolve();
              } else {
                reject(
                  new Error(
                    `Piper ONNX exited with code ${code}: ${stderr.slice(0, 240)}`,
                  ),
                );
              }
            });
            child.stdin.write(text + "\n");
            child.stdin.end();
          });
          synthesizedWithNeural = true;
          sourceSampleRate = 22050;
        } catch {
          synthesizedWithNeural = false;
        }
      }

      if (!synthesizedWithNeural) {
        sourceSampleRate = 16000;
        const lang = String(language || "en").toLowerCase();
        if (lang === "en" || lang === "auto" || lang.startsWith("en-")) {
          const stretch = (1.0 / numericSpeed).toFixed(2);
          await execFileAsync("flite", [
            "-voice",
            cfg.fliteVoice,
            "--setf",
            `duration_stretch=${stretch}`,
            "-t",
            text,
            "-o",
            rawWav,
          ]);
        } else {
          const wpm = Math.round(155 * numericSpeed);
          await execFileAsync("espeak-ng", [
            "-v",
            cfg.espeakVoice,
            "-s",
            String(wpm),
            "-w",
            rawWav,
            text,
          ]);
        }
      }

      // Broadcast studio vocal clarity mastering:
      // 1. High-pass at 85Hz to remove rumble
      // 2. Warm chest body at 195Hz (+1.8dB)
      // 3. Mud cut at 380Hz (-1.5dB) for clean vowel separation
      // 4. Articulation & consonant clarity boost at 3.1kHz (+2.4dB) and air at 6.8kHz (+1.4dB)
      // 5. Gentle broadcast compressor + brickwall limiter at 0.95
      const afParts: string[] = [];
      if (Math.abs(cfg.pitchShiftSemitones) > 0.05) {
        const pitchFactor = Math.pow(2, cfg.pitchShiftSemitones / 12).toFixed(4);
        afParts.push(`asetrate=${sourceSampleRate}*${pitchFactor}`);
      }
      afParts.push(
        "aresample=24000",
        "highpass=f=85",
        "equalizer=f=195:t=q:w=1.3:g=1.8",
        "equalizer=f=380:t=q:w=1.6:g=-1.5",
        "equalizer=f=3100:t=q:w=1.4:g=2.4",
        "equalizer=f=6800:t=q:w=1.8:g=1.4",
        "acompressor=threshold=-18dB:ratio=2.4:attack=10:release=90:makeup=2.2dB",
        "alimiter=limit=0.95",
        "apad=pad_dur=0.16",
      );
      const afChain = afParts.join(",");

      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        rawWav,
        "-af",
        afChain,
        "-ac",
        "1",
        "-ar",
        "24000",
        "-c:a",
        "pcm_s16le",
        outWav,
      ]);

      const wavBytes = fs.readFileSync(outWav);
      res.setHeader("Content-Type", "audio/wav");
      return res.send(wavBytes);
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : "Speech synthesis failed",
      });
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  });

  await new Promise<void>((resolve) => {
    const server = vApp.listen(port, "127.0.0.1", () => {
      console.log(
        `VoiceStudio (k2-fsa/OmniVoice Neural VITS ONNX service) active on http://127.0.0.1:${port}`,
      );
      resolve();
    });
    server.on("error", () => {
      resolve();
    });
  });
}
