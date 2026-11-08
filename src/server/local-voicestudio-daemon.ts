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

function synthesizeWithPiperOnnx(params: {
  text: string;
  modelPath: string;
  outputWavPath: string;
  lengthScale: number;
  noiseScale?: number;
  noiseW?: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "--model",
      params.modelPath,
      "--output_file",
      params.outputWavPath,
      "--length_scale",
      params.lengthScale.toFixed(3),
      "--noise_scale",
      (params.noiseScale ?? 0.45).toFixed(3),
      "--noise_w",
      (params.noiseW ?? 0.6).toFixed(3),
      "--sentence_silence",
      "0.22",
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
      if (code === 0 && fs.existsSync(params.outputWavPath)) {
        resolve();
      } else {
        reject(
          new Error(
            `Piper ONNX exited with code ${code}: ${stderr.slice(0, 240)}`,
          ),
        );
      }
    });
    child.stdin.write(params.text + "\n");
    child.stdin.end();
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
      } = req.body || {};

      const text = String(input || "").trim();
      if (!text) {
        return res.status(400).json({ error: "Missing input text" });
      }

      const cfg = selectVoiceConfig(
        String(voice),
        String(language),
        String(instruct),
      );
      const numericSpeed = Math.max(0.75, Math.min(1.25, Number(speed) || 1.0));

      let synthesizedWithNeural = false;
      let sourceSampleRate = 22050;

      if (cfg.onnxModelPath) {
        try {
          // Slightly relaxed lengthScale (1.02 / speed) prevents rushed/cranky cadence
          const lengthScale = Math.max(0.92, Math.min(1.18, 1.02 / numericSpeed));
          await synthesizeWithPiperOnnx({
            text,
            modelPath: cfg.onnxModelPath,
            outputWavPath: rawWav,
            lengthScale,
            noiseScale: 0.45,
            noiseW: 0.6,
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

      // Warm studio mastering: gentle chest warmth at 180Hz, smooth de-harsh cut at 3.8kHz, soft lowpass at 8.2kHz
      const afParts: string[] = [];
      if (Math.abs(cfg.pitchShiftSemitones) > 0.05) {
        const pitchFactor = Math.pow(2, cfg.pitchShiftSemitones / 12).toFixed(4);
        afParts.push(`asetrate=${sourceSampleRate}*${pitchFactor}`);
      }
      afParts.push(
        "aresample=24000",
        "highpass=f=80",
        "equalizer=f=180:t=q:w=1.2:g=2.0",
        "equalizer=f=3800:t=q:w=1.8:g=-3.2",
        "lowpass=f=8200",
        "alimiter=limit=0.92",
        "apad=pad_dur=0.12",
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
