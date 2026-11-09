import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  HardwareInspectionReport,
  OmniVoiceSpeechRequest,
  OmniVoiceSpeechResponse,
  VoiceProfileConfig,
  VoiceStudioStatusResponse,
} from "../utils/types";
import {
  computeDialogueAudioCacheKey,
  extractLipSyncFromWavBytes,
  sanitizeOmniVoiceInstruct,
} from "../utils/animation-math";
import {
  BUILT_IN_VOICE_PROFILES,
  OMNIVOICE_SUPPORTED_LANGUAGES,
} from "../assets/preset-library";

const execFileAsync = promisify(execFile);

const VOICESTUDIO_BASE_URL = (
  process.env.VOICESTUDIO_API_URL || "http://localhost:3900"
).replace(/\/+$/, "");

const OMNIVOICE_DATA_DIR = path.resolve(
  process.env.OMNIVOICE_DATA_DIR || "./data/voicestudio",
);
const GENERATED_AUDIO_DIR = path.resolve("./public/generated-audio");
const PROFILES_JSON_PATH = path.join(OMNIVOICE_DATA_DIR, "profiles.json");

function ensureDirectories() {
  fs.mkdirSync(OMNIVOICE_DATA_DIR, { recursive: true });
  fs.mkdirSync(GENERATED_AUDIO_DIR, { recursive: true });
}

export async function inspectSystemHardware(): Promise<HardwareInspectionReport> {
  ensureDirectories();
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || "Generic x86_64 CPU";
  const cpuCores = cpus.length;
  const totalRamGb = Number((os.totalmem() / 1024 ** 3).toFixed(1));
  const availableRamGb = Number((os.freemem() / 1024 ** 3).toFixed(1));

  let hasNvidiaGpu = false;
  let gpuName: string | null = null;
  let vramGb: number | null = null;

  try {
    const { stdout } = await execFileAsync("nvidia-smi", [
      "--query-gpu=name,memory.total",
      "--format=csv,noheader,nounits",
    ]);
    const firstLine = stdout.trim().split("\n")[0];
    if (firstLine) {
      const parts = firstLine.split(",").map((s) => s.trim());
      hasNvidiaGpu = true;
      gpuName = parts[0] || "NVIDIA GPU";
      vramGb = parts[1] ? Number((Number(parts[1]) / 1024).toFixed(1)) : null;
    }
  } catch {
    hasNvidiaGpu = false;
  }

  let diskFreeGb = 50;
  try {
    const { stdout } = await execFileAsync("df", ["-BG", "/"]);
    const lines = stdout.trim().split("\n");
    if (lines.length >= 2) {
      const cols = lines[1].split(/\s+/);
      if (cols[3]) {
        diskFreeGb = parseInt(cols[3].replace("G", ""), 10) || 50;
      }
    }
  } catch {
    // Fallback
  }

  return {
    platform: `${os.platform()}-${os.arch()}`,
    cpuModel,
    cpuCores,
    totalRamGb,
    availableRamGb,
    hasNvidiaGpu,
    gpuName,
    vramGb,
    diskFreeGb,
    recommendedTorchVariant: hasNvidiaGpu ? "cuda" : "cpu",
    persistentModelDir: OMNIVOICE_DATA_DIR,
  };
}

export function loadSavedVoiceProfiles(): VoiceProfileConfig[] {
  ensureDirectories();
  const customProfiles: VoiceProfileConfig[] = [];
  if (fs.existsSync(PROFILES_JSON_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(PROFILES_JSON_PATH, "utf8"));
      if (Array.isArray(raw)) {
        customProfiles.push(...raw);
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  const merged = [...BUILT_IN_VOICE_PROFILES];
  for (const cp of customProfiles) {
    const existingIdx = merged.findIndex((p) => p.voiceId === cp.voiceId);
    if (existingIdx >= 0) {
      merged[existingIdx] = cp;
    } else {
      merged.push(cp);
    }
  }
  return merged;
}

export function saveCustomVoiceProfile(
  profile: VoiceProfileConfig,
): VoiceProfileConfig[] {
  ensureDirectories();
  const current = loadSavedVoiceProfiles().filter((p) => p.isCustomProfile);
  const idx = current.findIndex((p) => p.voiceId === profile.voiceId);
  if (idx >= 0) {
    current[idx] = profile;
  } else {
    current.push(profile);
  }
  fs.writeFileSync(PROFILES_JSON_PATH, JSON.stringify(current, null, 2));
  return loadSavedVoiceProfiles();
}

export async function checkVoiceStudioStatus(): Promise<VoiceStudioStatusResponse> {
  const hardware = await inspectSystemHardware();
  const localProfiles = loadSavedVoiceProfiles();
  const supportedLanguages = OMNIVOICE_SUPPORTED_LANGUAGES.map((l) => l.code);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const healthRes = await fetch(`${VOICESTUDIO_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!healthRes.ok) {
      return {
        connected: false,
        baseUrl: VOICESTUDIO_BASE_URL,
        engine: "omnivoice",
        omniVoiceLoaded: false,
        availableVoices: localProfiles,
        supportedLanguages,
        hardware,
        errorMessage: `VoiceStudio returned HTTP ${healthRes.status} on /health.`,
      };
    }

    let omniVoiceLoaded = true;
    const remoteVoices: VoiceProfileConfig[] = [...localProfiles];

    try {
      const voicesRes = await fetch(`${VOICESTUDIO_BASE_URL}/v1/audio/voices`);
      if (voicesRes.ok) {
        const data = (await voicesRes.json()) as {
          voices?: Array<{
            id?: string;
            voice_id?: string;
            name?: string;
            language?: string;
          }>;
          engines?: Array<{ id?: string; loaded?: boolean }>;
        };
        if (Array.isArray(data.engines)) {
          const ov = data.engines.find((e) => e.id === "omnivoice");
          if (ov && typeof ov.loaded === "boolean") {
            omniVoiceLoaded = ov.loaded;
          }
        }
        if (Array.isArray(data.voices)) {
          for (const v of data.voices) {
            const vid = v.voice_id || v.id || v.name;
            if (
              vid &&
              !remoteVoices.some(
                (existing) =>
                  existing.voiceId.toLowerCase() === vid.toLowerCase(),
              )
            ) {
              remoteVoices.push({
                voiceId: vid,
                name: v.name || vid,
                engine: "omnivoice",
                gender: "female",
                age: "young adult",
                pitch: "moderate pitch",
                style: "none",
                accent: "american accent",
                language: v.language || "auto",
                speed: 1.0,
                instruct: "female, young adult, moderate pitch, american accent",
                description: `VoiceStudio registered voice (${vid})`,
                isCustomProfile: true,
              });
            }
          }
        }
      }
    } catch {
      // Optional /v1/audio/voices enrichment
    }

    return {
      connected: true,
      baseUrl: VOICESTUDIO_BASE_URL,
      engine: "omnivoice",
      omniVoiceLoaded,
      availableVoices: remoteVoices,
      supportedLanguages,
      hardware,
      errorMessage: null,
    };
  } catch {
    return {
      connected: false,
      baseUrl: VOICESTUDIO_BASE_URL,
      engine: "omnivoice",
      omniVoiceLoaded: false,
      availableVoices: localProfiles,
      supportedLanguages,
      hardware,
      errorMessage: `VoiceStudio (k2-fsa/OmniVoice) is not reachable at ${VOICESTUDIO_BASE_URL}. Start VoiceStudio via './scripts/start-voicestudio.sh' or 'docker compose -f docker-compose.voicestudio.yml up -d', or upload a WAV/MP3 dialogue recording directly.`,
    };
  }
}

export async function probeAudioDurationSeconds(
  filePath: string,
): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const parsed = parseFloat(stdout.trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function synthesizeSceneSpeechWithOmniVoice(
  req: OmniVoiceSpeechRequest,
): Promise<OmniVoiceSpeechResponse> {
  ensureDirectories();

  const text = (req.text || "").trim();
  if (!text) {
    throw new Error("Dialogue text cannot be empty.");
  }

  const sanitizedInstruct = sanitizeOmniVoiceInstruct(req.instruct || "");
  const speed = Math.max(0.5, Math.min(2.0, Number(req.speed) || 1.0));
  const language = (req.language || "en").trim();

  const cacheKey = computeDialogueAudioCacheKey({
    text,
    voiceId: req.voiceId || "nemo",
    language,
    speed,
    instruct: sanitizedInstruct,
  });

  const fileName = `vo-${req.sceneId}-${cacheKey}.wav`;
  const filePath = path.join(GENERATED_AUDIO_DIR, fileName);
  const publicUrl = `/generated-audio/${fileName}`;

  // 1. Return cached audio if valid and non-empty
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 200) {
      const durationSeconds = await probeAudioDurationSeconds(filePath);
      if (durationSeconds > 0) {
        const wavBytes = new Uint8Array(fs.readFileSync(filePath));
        const { envelope, wordTimings } = extractLipSyncFromWavBytes(
          wavBytes,
          text,
        );
        return {
          audioUrl: publicUrl,
          cacheKey,
          durationSeconds,
          sampleRate: 24000,
          lipSync: envelope,
          wordTimings,
          cached: true,
          engine: "omnivoice",
          voiceId: req.voiceId,
          language,
        };
      }
    }
  }

  // 2. Call VoiceStudio OpenAI-compatible /v1/audio/speech endpoint with model: "omnivoice"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.OMNIVOICE_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.OMNIVOICE_API_KEY}`;
  }

  const payload: Record<string, unknown> = {
    model: "omnivoice",
    input: text,
    voice: req.voiceId || "nemo",
    response_format: "wav",
    speed,
  };
  if (language && language !== "auto") {
    payload.language = language;
  }
  if (sanitizedInstruct) {
    payload.instruct = sanitizedInstruct;
  }
  if (req.instruct) {
    payload.raw_instruct = req.instruct;
  }

  let response: Response;
  try {
    response = await fetch(`${VOICESTUDIO_BASE_URL}/v1/audio/speech`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(
      `VoiceStudio service unreachable at ${VOICESTUDIO_BASE_URL}/v1/audio/speech (${err instanceof Error ? err.message : String(err)}). Ensure VoiceStudio with k2-fsa/OmniVoice is running or upload dialogue audio.`,
    );
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `VoiceStudio /v1/audio/speech returned HTTP ${response.status}: ${errBody.slice(0, 300)}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  if (rawBytes.byteLength < 100) {
    throw new Error(
      `VoiceStudio returned an invalid/empty audio payload (${rawBytes.byteLength} bytes).`,
    );
  }

  // Write raw response and normalize via FFmpeg to 24kHz 16-bit mono PCM WAV so lip-sync and mixer are 100% deterministic
  const rawTempPath = path.join(
    GENERATED_AUDIO_DIR,
    `raw-${Date.now()}-${cacheKey}.tmp`,
  );
  fs.writeFileSync(rawTempPath, rawBytes);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      rawTempPath,
      "-ac",
      "1",
      "-ar",
      "24000",
      "-c:a",
      "pcm_s16le",
      filePath,
    ]);
  } finally {
    if (fs.existsSync(rawTempPath)) {
      fs.unlinkSync(rawTempPath);
    }
  }

  const durationSeconds = await probeAudioDurationSeconds(filePath);
  if (durationSeconds <= 0) {
    throw new Error(
      "Generated audio failed ffprobe validation (duration <= 0).",
    );
  }

  const normalizedWavBytes = new Uint8Array(fs.readFileSync(filePath));
  const { envelope, wordTimings } = extractLipSyncFromWavBytes(
    normalizedWavBytes,
    text,
  );

  return {
    audioUrl: publicUrl,
    cacheKey,
    durationSeconds,
    sampleRate: 24000,
    lipSync: envelope,
    wordTimings,
    cached: false,
    engine: "omnivoice",
    voiceId: req.voiceId,
    language,
  };
}

export async function processUploadedDialogueAudio(params: {
  sceneId: string;
  text: string;
  voiceId: string;
  language: string;
  audioBase64: string;
  fileName: string;
}): Promise<OmniVoiceSpeechResponse> {
  ensureDirectories();
  const cleanBase64 = params.audioBase64.replace(
    /^data:audio\/[^;]+;base64,/,
    "",
  );
  const inputBytes = Buffer.from(cleanBase64, "base64");
  if (inputBytes.byteLength < 64) {
    throw new Error("Uploaded audio file is empty or corrupted.");
  }

  const cacheKey = computeDialogueAudioCacheKey({
    text: params.text || params.fileName,
    voiceId: params.voiceId || "uploaded",
    language: params.language || "en",
    speed: 1.0,
    instruct: `uploaded-${inputBytes.byteLength}`,
  });

  const tempInputPath = path.join(
    GENERATED_AUDIO_DIR,
    `upload-in-${Date.now()}-${cacheKey}.bin`,
  );
  const outFileName = `vo-upload-${params.sceneId}-${cacheKey}.wav`;
  const outFilePath = path.join(GENERATED_AUDIO_DIR, outFileName);
  const publicUrl = `/generated-audio/${outFileName}`;

  fs.writeFileSync(tempInputPath, inputBytes);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      tempInputPath,
      "-ac",
      "1",
      "-ar",
      "24000",
      "-c:a",
      "pcm_s16le",
      outFilePath,
    ]);
  } finally {
    if (fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    }
  }

  const durationSeconds = await probeAudioDurationSeconds(outFilePath);
  if (durationSeconds <= 0) {
    throw new Error(
      "Uploaded audio could not be decoded by FFmpeg. Please upload a valid WAV, MP3, M4A, or OGG file.",
    );
  }

  const wavBytes = new Uint8Array(fs.readFileSync(outFilePath));
  const { envelope, wordTimings } = extractLipSyncFromWavBytes(
    wavBytes,
    params.text,
  );

  return {
    audioUrl: publicUrl,
    cacheKey,
    durationSeconds,
    sampleRate: 24000,
    lipSync: envelope,
    wordTimings,
    cached: false,
    engine: "omnivoice",
    voiceId: params.voiceId || "uploaded",
    language: params.language || "en",
  };
}
