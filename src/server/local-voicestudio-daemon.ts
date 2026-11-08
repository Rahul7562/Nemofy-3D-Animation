import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BUILT_IN_VOICE_PROFILES } from "../assets/preset-library";

const execFileAsync = promisify(execFile);

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
 * Selects the best CMU Arctic / Flite voice or espeak-ng voice based on character
 * voiceId, language, and OmniVoice instruct tags.
 */
function selectVoiceConfig(
  voiceId: string,
  language: string,
  instruct: string,
): {
  useFlite: boolean;
  fliteVoice: "slt" | "rms" | "kal16" | "awb";
  espeakVoice: string;
  pitchShiftSemitones: number;
} {
  const v = (voiceId || "").toLowerCase();
  const inst = (instruct || "").toLowerCase();
  const lang = (language || "en").toLowerCase();

  const isFemale =
    v.includes("nemo") ||
    v.includes("aria") ||
    v.includes("slt") ||
    (inst.includes("female") && !inst.includes("male"));

  const isBritishOrScottish =
    v.includes("kaelen") || inst.includes("british") || inst.includes("scottish");

  let pitchShiftSemitones = 0;
  if (inst.includes("high pitch") || v.includes("nemo")) {
    pitchShiftSemitones = 1.2;
  } else if (inst.includes("low pitch") || v.includes("kaelen")) {
    pitchShiftSemitones = -1.5;
  }

  const useFlite = lang === "en" || lang === "auto" || lang.startsWith("en-");
  const fliteVoice: "slt" | "rms" | "kal16" | "awb" = isFemale
    ? "slt"
    : isBritishOrScottish
      ? "awb"
      : "rms";

  const langBase = lang === "auto" ? "en" : lang.split("-")[0];
  const espeakVoice = isFemale ? `${langBase}+f3` : `${langBase}+m3`;

  return {
    useFlite,
    fliteVoice,
    espeakVoice,
    pitchShiftSemitones,
  };
}

/**
 * Starts a local OpenAI-compatible VoiceStudio (k2-fsa/OmniVoice contract) service on
 * port 3900 if an external GPU VoiceStudio container is not already bound to 3900.
 */
export async function ensureLocalVoiceStudioService(port = 3900): Promise<void> {
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
      mode: "local-cpu-synthesizer",
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

      const cfg = selectVoiceConfig(String(voice), String(language), String(instruct));
      const numericSpeed = Math.max(0.6, Math.min(1.8, Number(speed) || 1.0));

      if (cfg.useFlite) {
        const stretch = (1.0 / (numericSpeed * 1.12)).toFixed(2);
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
        const wpm = Math.round(165 * numericSpeed);
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

      // Apply warm broadcast presence EQ + pitch shift + 24kHz 16-bit mono PCM normalization
      const pitchFactor = Math.pow(2, cfg.pitchShiftSemitones / 12).toFixed(4);
      const afChain = [
        `asetrate=16000*${pitchFactor}`,
        "aresample=24000",
        "highpass=f=85",
        "lowpass=f=7600",
        "apad=pad_dur=0.12",
      ].join(",");

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
        `VoiceStudio (k2-fsa/OmniVoice API service) active on http://127.0.0.1:${port}`,
      );
      resolve();
    });
    server.on("error", () => {
      resolve();
    });
  });
}
