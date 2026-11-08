import {
  AspectRatioPreset,
  CameraTransformState,
  CharacterJointPose,
  ComputedSceneTiming,
  LipSyncEnvelopePoint,
  LipSyncWordTiming,
  PreviewQualityProfile,
  SceneCharacterPlacement,
  StoryboardScene,
  TransitionType,
} from "./types";

export function seededRandom(seed: string | number): number {
  const str = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function smootherstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function getDimensionsForAspectRatio(
  aspectRatio: AspectRatioPreset,
): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "16:9":
    default:
      return { width: 1920, height: 1080 };
  }
}

export function getPreviewDimensionsForAspectRatio(
  aspectRatio: AspectRatioPreset,
  quality: PreviewQualityProfile = "high",
): { width: number; height: number } {
  const mult = quality === "draft" ? 0.5 : quality === "medium" ? 0.75 : 1;
  switch (aspectRatio) {
    case "9:16":
      return {
        width: Math.round((360 * mult) / 2) * 2,
        height: Math.round((640 * mult) / 2) * 2,
      };
    case "1:1":
      return {
        width: Math.round((480 * mult) / 2) * 2,
        height: Math.round((480 * mult) / 2) * 2,
      };
    case "16:9":
    default:
      return {
        width: Math.round((640 * mult) / 2) * 2,
        height: Math.round((360 * mult) / 2) * 2,
      };
  }
}

export function formatTimecode(frame: number, fps: number): string {
  const safeFrame = Math.max(0, Math.floor(frame));
  const safeFps = Math.max(1, Math.floor(fps));
  const totalSeconds = Math.floor(safeFrame / safeFps);
  const ff = safeFrame % safeFps;
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function computeSceneTimeline(
  scenes: StoryboardScene[],
  fps: number,
): {
  timings: ComputedSceneTiming[];
  totalFrames: number;
  totalDurationSeconds: number;
} {
  let cursor = 0;
  const timings: ComputedSceneTiming[] = [];

  for (const scene of scenes) {
    const durationInFrames = Math.max(
      15,
      Math.round(scene.durationInSeconds * fps),
    );
    const startFrame = cursor;
    const endFrame = cursor + durationInFrames;
    timings.push({
      scene,
      startFrame,
      endFrame,
      durationInFrames,
    });
    cursor = endFrame;
  }

  const totalFrames = Math.max(30, cursor);
  return {
    timings,
    totalFrames,
    totalDurationSeconds: Number((totalFrames / fps).toFixed(2)),
  };
}

export function getActiveSceneAtFrame(
  scenes: StoryboardScene[],
  globalFrame: number,
  fps: number,
): {
  activeTiming: ComputedSceneTiming;
  localFrame: number;
  sceneIndex: number;
} {
  const { timings } = computeSceneTimeline(scenes, fps);
  if (timings.length === 0) {
    throw new Error("Project must contain at least one scene");
  }
  const clampedFrame = Math.max(0, globalFrame);
  for (let i = 0; i < timings.length; i++) {
    const item = timings[i];
    if (clampedFrame >= item.startFrame && clampedFrame < item.endFrame) {
      return {
        activeTiming: item,
        localFrame: clampedFrame - item.startFrame,
        sceneIndex: i,
      };
    }
  }
  const last = timings[timings.length - 1];
  return {
    activeTiming: last,
    localFrame: Math.max(0, last.durationInFrames - 1),
    sceneIndex: timings.length - 1,
  };
}

export function computeCameraTransformAtFrame(
  scene: StoryboardScene,
  localFrame: number,
  durationInFrames: number,
  fps: number,
): CameraTransformState {
  const total = Math.max(1, durationInFrames - 1);
  const rawProgress = clamp(localFrame / total, 0, 1);
  const eased = smootherstep(rawProgress);
  const timeSec = localFrame / Math.max(1, fps);

  const [sx, sy, sz] = scene.cameraStartPos;
  const [ex, ey, ez] = scene.cameraEndPos;
  const [tx, ty, tz] = scene.cameraTarget;

  let px = lerp(sx, ex, eased);
  let py = lerp(sy, ey, eased);
  let pz = lerp(sz, ez, eased);

  let lookX = tx;
  let lookY = ty;
  let lookZ = tz;
  let fov = scene.cameraFov;
  let roll = 0;

  switch (scene.cameraMovement) {
    case "orbit": {
      const dx = sx - tx;
      const dz = sz - tz;
      const radius = Math.max(2.5, Math.hypot(dx, dz));
      const baseAngle = Math.atan2(dx, dz);
      const sweep = Math.PI * 0.42;
      const currentAngle = baseAngle + lerp(-sweep * 0.3, sweep * 0.7, eased);
      px = tx + Math.sin(currentAngle) * radius;
      pz = tz + Math.cos(currentAngle) * radius;
      py = lerp(sy, ey, eased) + Math.sin(rawProgress * Math.PI) * 0.35;
      roll = Math.sin(rawProgress * Math.PI) * 0.025;
      break;
    }
    case "dolly-in": {
      const dollyFactor = lerp(1.0, 0.58, eased);
      px = tx + (sx - tx) * dollyFactor;
      py = lerp(sy, ey, eased);
      pz = tz + (sz - tz) * dollyFactor;
      fov = lerp(scene.cameraFov, Math.max(24, scene.cameraFov - 6), eased);
      break;
    }
    case "dolly-out": {
      const dollyOutFactor = lerp(0.65, 1.18, eased);
      px = tx + (sx - tx) * dollyOutFactor;
      py = lerp(sy, ey, eased);
      pz = tz + (sz - tz) * dollyOutFactor;
      fov = lerp(Math.max(24, scene.cameraFov - 5), scene.cameraFov + 4, eased);
      break;
    }
    case "tracking": {
      const lead = scene.characters[0];
      if (lead) {
        const charX = lerp(lead.startPosition[0], lead.endPosition[0], eased);
        const charZ = lerp(lead.startPosition[2], lead.endPosition[2], eased);
        lookX = charX;
        lookY = lead.startPosition[1] + 1.25;
        lookZ = charZ;
        px = charX + lerp(sx, ex, eased) * 0.65;
        py = lerp(sy, ey, eased);
        pz = charZ + Math.max(3.2, sz * 0.75);
      }
      roll = Math.sin(timeSec * 1.8) * 0.015;
      break;
    }
    case "crane-up": {
      py = lerp(Math.min(sy, 1.4), Math.max(ey, sy + 3.4), eased);
      lookY = lerp(ty, ty + 0.85, eased);
      break;
    }
    case "establishing-wide": {
      if (scene.environment === "agent-command-desk") {
        px = lerp(sx, ex, eased);
        py = lerp(sy, ey, eased);
        pz = lerp(sz, ez, eased);
        fov = scene.cameraFov;
      } else {
        px = lerp(sx * 1.15, ex * 1.05, eased);
        py = lerp(Math.max(sy, 4.2), Math.max(ey, 3.6), eased);
        pz = lerp(sz * 1.15, ez * 1.05, eased);
        fov = Math.max(46, scene.cameraFov);
      }
      break;
    }
    case "close-up": {
      if (scene.environment === "agent-command-desk") {
        px = lerp(sx, ex, eased);
        py = lerp(sy, ey, eased);
        pz = lerp(sz, ez, eased);
        fov = scene.cameraFov;
        break;
      }
      const focusChar =
        scene.characters.find((c) => c.speaking) ?? scene.characters[0];
      if (focusChar) {
        const cx = lerp(
          focusChar.startPosition[0],
          focusChar.endPosition[0],
          eased,
        );
        const cy = focusChar.startPosition[1] + 1.45;
        const cz = lerp(
          focusChar.startPosition[2],
          focusChar.endPosition[2],
          eased,
        );
        lookX = cx;
        lookY = cy;
        lookZ = cz;
        const angle = focusChar.rotationY + lerp(-0.18, 0.18, eased);
        px = cx + Math.sin(angle) * 2.35;
        py = cy + 0.15;
        pz = cz + Math.cos(angle) * 2.35;
        fov = Math.min(34, scene.cameraFov);
      }
      break;
    }
    case "crash-zoom": {
      const focusChar =
        scene.characters.find((c) => c.speaking) ?? scene.characters[0];
      const punchT = smoothstep(clamp(rawProgress * 2.4, 0, 1));
      if (scene.environment === "agent-command-desk") {
        px = lerp(sx, ex, punchT);
        py = lerp(sy, ey, punchT);
        pz = lerp(sz, ez, punchT);
        fov = lerp(scene.cameraFov, Math.max(24, scene.cameraFov - 5), punchT);
        break;
      }
      if (focusChar) {
        const cx = lerp(
          focusChar.startPosition[0],
          focusChar.endPosition[0],
          eased,
        );
        const cy = focusChar.startPosition[1] + 1.48;
        const cz = lerp(
          focusChar.startPosition[2],
          focusChar.endPosition[2],
          eased,
        );
        lookX = lerp(tx, cx, punchT);
        lookY = lerp(ty, cy, punchT);
        lookZ = lerp(tz, cz, punchT);
        const dist = lerp(4.2, 2.05, punchT);
        const angle = focusChar.rotationY * 0.45;
        px = lookX + Math.sin(angle) * dist;
        py = cy + lerp(0.45, 0.12, punchT);
        pz = lookZ + Math.cos(angle) * dist;
        fov = lerp(Math.max(44, scene.cameraFov), 28, punchT);
        roll = Math.sin(punchT * Math.PI) * 0.035;
      }
      break;
    }
    case "shot-reverse-shot": {
      if (scene.environment === "agent-command-desk") {
        px = lerp(sx, ex, eased);
        py = lerp(sy, ey, eased);
        pz = lerp(sz, ez, eased);
        fov = scene.cameraFov;
        break;
      }
      const speaker =
        scene.characters.find((c) => c.speaking) ?? scene.characters[0];
      const listener =
        scene.characters.find((c) => !c.speaking) ?? scene.characters[1] ?? speaker;
      if (speaker) {
        const sxChar = lerp(
          speaker.startPosition[0],
          speaker.endPosition[0],
          eased,
        );
        const syChar = speaker.startPosition[1] + 1.42;
        const szChar = lerp(
          speaker.startPosition[2],
          speaker.endPosition[2],
          eased,
        );
        const lxChar = listener ? listener.startPosition[0] : 0;
        lookX = sxChar * 0.72 + lxChar * 0.28;
        lookY = syChar;
        lookZ = szChar;
        const sideSign = sxChar >= 0 ? -1 : 1;
        px = sxChar + sideSign * 0.95 + lerp(-0.18, 0.18, eased);
        py = syChar + 0.18;
        pz = szChar + 2.65;
        fov = Math.min(36, scene.cameraFov);
      }
      break;
    }
    case "static":
    default: {
      py = sy + Math.sin(timeSec * 1.2) * 0.04;
      break;
    }
  }

  return {
    position: [px, py, pz],
    target: [lookX, lookY, lookZ],
    fov,
    roll,
  };
}

/**
 * OmniVoice valid voice-design instruct categories from debpalash/VoiceStudio
 * (`omnivoice/utils/voice_design.py`).
 */
export const OMNIVOICE_INSTRUCT_CATEGORIES: string[][] = [
  ["male", "female", "男", "女"],
  [
    "child",
    "teenager",
    "young adult",
    "middle-aged",
    "elderly",
    "儿童",
    "少年",
    "青年",
    "中年",
    "老年",
  ],
  [
    "very low pitch",
    "low pitch",
    "moderate pitch",
    "high pitch",
    "very high pitch",
    "极低音调",
    "低音调",
    "中音调",
    "高音调",
    "极高音调",
  ],
  ["whisper", "耳语"],
  [
    "american accent",
    "british accent",
    "australian accent",
    "chinese accent",
    "canadian accent",
    "indian accent",
    "korean accent",
    "portuguese accent",
    "russian accent",
    "japanese accent",
  ],
  [
    "河南话",
    "陕西话",
    "四川话",
    "贵州话",
    "云南话",
    "桂林话",
    "济南话",
    "石家庄话",
    "甘肃话",
    "宁夏话",
    "青岛话",
    "东北话",
  ],
];

export function sanitizeOmniVoiceInstruct(
  raw: string | undefined | null,
): string {
  if (!raw || typeof raw !== "string") return "";
  const parts = raw
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const seenCategories = new Set<number>();
  const validOut: string[] = [];

  for (const token of parts) {
    let catIdx = -1;
    for (let i = 0; i < OMNIVOICE_INSTRUCT_CATEGORIES.length; i++) {
      if (OMNIVOICE_INSTRUCT_CATEGORIES[i].includes(token)) {
        catIdx = i;
        break;
      }
    }
    if (catIdx >= 0 && !seenCategories.has(catIdx)) {
      seenCategories.add(catIdx);
      validOut.push(token);
    }
  }
  return validOut.join(", ");
}

/**
 * Computes a deterministic cache hash for dialogue audio synthesis so that
 * changing lighting or camera never invalidates cached speech, whereas
 * changing dialogue text, voiceId, language, speed, or instruct does.
 */
export function computeDialogueAudioCacheKey(params: {
  text: string;
  voiceId: string;
  language: string;
  speed: number;
  instruct: string;
}): string {
  const normalized = [
    (params.text || "").trim(),
    (params.voiceId || "nemo").trim().toLowerCase(),
    (params.language || "en").trim().toLowerCase(),
    Number(params.speed || 1.0).toFixed(2),
    sanitizeOmniVoiceInstruct(params.instruct || ""),
  ].join("|");

  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0, ch; i < normalized.length; i++) {
    ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

/**
 * Extracts a 30Hz normalized RMS amplitude + zero-crossing viseme envelope
 * and estimated word timings from raw 16-bit PCM WAV bytes.
 */
export function extractLipSyncFromWavBytes(
  wavBytes: Uint8Array,
  dialogueText = "",
): {
  envelope: LipSyncEnvelopePoint[];
  wordTimings: LipSyncWordTiming[];
  durationSeconds: number;
} {
  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataLength = Math.max(0, wavBytes.byteLength - 44);

  if (wavBytes.byteLength >= 44) {
    const view = new DataView(
      wavBytes.buffer,
      wavBytes.byteOffset,
      wavBytes.byteLength,
    );
    const riff =
      String.fromCharCode(view.getUint8(0)) +
      String.fromCharCode(view.getUint8(1)) +
      String.fromCharCode(view.getUint8(2)) +
      String.fromCharCode(view.getUint8(3));
    if (riff === "RIFF") {
      numChannels = Math.max(1, view.getUint16(22, true));
      sampleRate = Math.max(8000, view.getUint32(24, true));
      bitsPerSample = view.getUint16(34, true) || 16;

      let offset = 12;
      while (offset + 8 <= wavBytes.byteLength) {
        const chunkId =
          String.fromCharCode(view.getUint8(offset)) +
          String.fromCharCode(view.getUint8(offset + 1)) +
          String.fromCharCode(view.getUint8(offset + 2)) +
          String.fromCharCode(view.getUint8(offset + 3));
        const chunkSize = view.getUint32(offset + 4, true);
        if (chunkId === "data") {
          dataOffset = offset + 8;
          dataLength = Math.min(chunkSize, wavBytes.byteLength - dataOffset);
          break;
        }
        offset += 8 + chunkSize + (chunkSize % 2);
      }
    }
  }

  const bytesPerSample = Math.max(1, (bitsPerSample >> 3) * numChannels);
  const totalSamples = Math.floor(dataLength / bytesPerSample);
  const durationSec = Math.max(0.1, totalSamples / sampleRate);
  const envRate = 30;
  const totalEnvFrames = Math.max(3, Math.ceil(durationSec * envRate));
  const samplesPerEnvFrame = Math.max(1, Math.floor(sampleRate / envRate));

  const view = new DataView(
    wavBytes.buffer,
    wavBytes.byteOffset,
    wavBytes.byteLength,
  );
  const rawRms: number[] = [];
  const rawZcr: number[] = [];
  let peakRms = 0.01;

  for (let f = 0; f < totalEnvFrames; f++) {
    const startSample = f * samplesPerEnvFrame;
    const endSample = Math.min(totalSamples, startSample + samplesPerEnvFrame);
    let sumSq = 0;
    let count = 0;
    let zeroCrossings = 0;
    let prevSign = 0;

    for (let s = startSample; s < endSample; s += 2) {
      const bytePos = dataOffset + s * bytesPerSample;
      if (bytePos + 2 <= wavBytes.byteLength) {
        const val =
          bitsPerSample === 16
            ? view.getInt16(bytePos, true) / 32768
            : (view.getUint8(bytePos) - 128) / 128;
        sumSq += val * val;
        const sign = val >= 0 ? 1 : -1;
        if (prevSign !== 0 && sign !== prevSign) {
          zeroCrossings++;
        }
        prevSign = sign;
        count++;
      }
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const zcr = count > 1 ? zeroCrossings / count : 0;
    if (rms > peakRms) peakRms = rms;
    rawRms.push(rms);
    rawZcr.push(zcr);
  }

  const envelope: LipSyncEnvelopePoint[] = rawRms.map((rms, idx) => {
    const normRms = clamp(Math.pow(rms / peakRms, 0.78), 0, 1);
    const zcr = rawZcr[idx] ?? 0;
    const mouthOpenness =
      normRms < 0.05 ? 0.02 : Number(clamp(normRms * 0.92, 0.04, 0.96).toFixed(3));
    const mouthWidth = Number(
      clamp(0.45 + zcr * 0.45 - normRms * 0.15, 0.32, 0.85).toFixed(3),
    );
    return {
      timeSec: Number((idx / envRate).toFixed(3)),
      mouthOpenness,
      mouthWidth,
      energy: Number(normRms.toFixed(3)),
    };
  });

  const rawWords = dialogueText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordTimings: LipSyncWordTiming[] = [];
  if (rawWords.length > 0) {
    const totalWeight = rawWords.reduce(
      (acc, w) => acc + Math.max(2, w.length),
      0,
    );
    let cursorSec = Math.min(0.12, durationSec * 0.05);
    const usableSpan = Math.max(0.2, durationSec - cursorSec * 2);

    for (const word of rawWords) {
      const weight = Math.max(2, word.length) / totalWeight;
      const wordDur = usableSpan * weight;
      wordTimings.push({
        word,
        startSec: Number(cursorSec.toFixed(3)),
        endSec: Number((cursorSec + wordDur * 0.92).toFixed(3)),
        viseme: word.length > 5 ? "open-vowel" : "consonant-close",
      });
      cursorSec += wordDur;
    }
  }

  return {
    envelope,
    wordTimings,
    durationSeconds: Number(durationSec.toFixed(3)),
  };
}

/**
 * Generates an approximate word-syllable cadence LipSyncEnvelopePoint[] fallback
 * when VoiceStudio audio has not yet been synthesized. Never indexes raw string characters.
 */
export function buildApproximateWordCadenceLipSync(
  dialogueText: string,
  durationSec: number,
): LipSyncEnvelopePoint[] {
  const safeDur = Math.max(0.5, durationSec);
  const envRate = 30;
  const totalEnvFrames = Math.max(5, Math.ceil(safeDur * envRate));
  const rawWords = dialogueText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const words: Array<{ word: string; startSec: number; endSec: number }> = [];
  if (rawWords.length > 0) {
    const startPad = Math.min(0.25, safeDur * 0.08);
    const usableSpan = Math.max(0.2, safeDur - startPad * 2);
    const totalSyl = rawWords.reduce(
      (acc, w) => acc + Math.max(1, Math.ceil(w.length / 3)),
      0,
    );
    let cursor = startPad;
    for (const w of rawWords) {
      const syl = Math.max(1, Math.ceil(w.length / 3));
      const span = (syl / totalSyl) * usableSpan;
      words.push({
        word: w,
        startSec: Number(cursor.toFixed(3)),
        endSec: Number((cursor + span * 0.86).toFixed(3)),
      });
      cursor += span;
    }
  }

  const points: LipSyncEnvelopePoint[] = [];
  for (let f = 0; f < totalEnvFrames; f++) {
    const t = f / envRate;
    const activeWord = words.find((w) => t >= w.startSec && t <= w.endSec);
    if (!activeWord) {
      points.push({
        timeSec: Number(t.toFixed(3)),
        mouthOpenness: 0.03,
        mouthWidth: 0.5,
        energy: 0.02,
      });
    } else {
      const wordSpan = Math.max(0.08, activeWord.endSec - activeWord.startSec);
      const localT = (t - activeWord.startSec) / wordSpan;
      const sylCount = Math.max(1, Math.ceil(activeWord.word.length / 3));
      const sylWave = Math.abs(Math.sin(localT * Math.PI * sylCount));
      const windowEnv = Math.sin(localT * Math.PI);
      const openness = Number(
        clamp(0.15 + sylWave * windowEnv * 0.78, 0.05, 0.95).toFixed(3),
      );
      points.push({
        timeSec: Number(t.toFixed(3)),
        mouthOpenness: openness,
        mouthWidth: Number(clamp(0.45 + (1 - openness) * 0.25, 0.35, 0.8).toFixed(3)),
        energy: openness,
      });
    }
  }

  return points;
}

export function computeLipSyncAtFrame(
  dialogueLine: string,
  speaking: boolean,
  localFrame: number,
  durationInFrames: number,
  fps: number,
  lipSyncData?: LipSyncEnvelopePoint[] | null,
): { mouthOpenness: number; mouthWidth: number; energy: number } {
  if (
    !speaking ||
    (!dialogueLine?.trim() && (!lipSyncData || lipSyncData.length === 0))
  ) {
    return { mouthOpenness: 0.04, mouthWidth: 0.5, energy: 0 };
  }

  const timeSec = localFrame / Math.max(1, fps);
  const sceneDurSec = durationInFrames / Math.max(1, fps);

  const points: LipSyncEnvelopePoint[] =
    lipSyncData && lipSyncData.length > 0
      ? lipSyncData
      : buildApproximateWordCadenceLipSync(dialogueLine, sceneDurSec);

  const exactIdx = timeSec * 30;
  const idx0 = Math.max(0, Math.min(points.length - 1, Math.floor(exactIdx)));
  const idx1 = Math.max(0, Math.min(points.length - 1, Math.ceil(exactIdx)));
  const frac = exactIdx - idx0;

  const p0 = points[idx0];
  const p1 = points[idx1];
  if (!p0 || !p1) {
    return { mouthOpenness: 0.04, mouthWidth: 0.5, energy: 0 };
  }

  const mouthOpenness = lerp(p0.mouthOpenness, p1.mouthOpenness, frac);
  const mouthWidth = lerp(p0.mouthWidth, p1.mouthWidth, frac);
  const energy = lerp(p0.energy, p1.energy, frac);

  return {
    mouthOpenness,
    mouthWidth,
    energy,
  };
}

export function computeCharacterPoseAtFrame(
  placement: SceneCharacterPlacement,
  localFrame: number,
  durationInFrames: number,
  fps: number,
  seedKey: string,
  sceneLipSyncData?: LipSyncEnvelopePoint[] | null,
): CharacterJointPose {
  const total = Math.max(1, durationInFrames - 1);
  const rawT = clamp(localFrame / total, 0, 1);
  const moveT = smoothstep(rawT);
  const timeSec = localFrame / Math.max(1, fps);
  const phaseOffset = seededRandom(seedKey) * Math.PI * 2;

  const wx = lerp(placement.startPosition[0], placement.endPosition[0], moveT);
  const wy = lerp(placement.startPosition[1], placement.endPosition[1], moveT);
  const wz = lerp(placement.startPosition[2], placement.endPosition[2], moveT);

  const dx = placement.endPosition[0] - placement.startPosition[0];
  const dz = placement.endPosition[2] - placement.startPosition[2];
  const travelDist = Math.hypot(dx, dz);

  const worldRotationY =
    travelDist > 0.25 ? Math.atan2(dx, dz) : placement.rotationY;

  const { mouthOpenness, mouthWidth, energy: speechEnergy } =
    computeLipSyncAtFrame(
      placement.dialogueLine,
      placement.speaking,
      localFrame,
      durationInFrames,
      fps,
      sceneLipSyncData,
    );

  let hipBobY = Math.sin(timeSec * 2.2 + phaseOffset) * 0.025;
  let torsoLeanX = 0;
  let torsoTwistY = Math.sin(timeSec * 1.5 + phaseOffset) * 0.05;
  let leftThighX = 0;
  let leftShinX = 0;
  let rightThighX = 0;
  let rightShinX = 0;
  let leftUpperArmX = 0;
  let leftUpperArmZ = 0.12;
  let leftForearmX = -0.18;
  let rightUpperArmX = 0;
  let rightUpperArmZ = -0.12;
  let rightForearmX = -0.18;

  switch (placement.action) {
    case "walk": {
      const freq = 5.4;
      const cycle = timeSec * freq + phaseOffset;
      hipBobY = Math.abs(Math.sin(cycle)) * 0.075;
      torsoLeanX = 0.08;
      torsoTwistY = Math.sin(cycle) * 0.12;
      leftThighX = Math.sin(cycle) * 0.55;
      rightThighX = -Math.sin(cycle) * 0.55;
      leftShinX = Math.max(0, -Math.cos(cycle) * 0.58);
      rightShinX = Math.max(0, Math.cos(cycle) * 0.58);
      leftUpperArmX = -Math.sin(cycle) * 0.42;
      rightUpperArmX = Math.sin(cycle) * 0.42;
      leftForearmX = -0.35 - Math.max(0, Math.sin(cycle)) * 0.25;
      rightForearmX = -0.35 - Math.max(0, -Math.sin(cycle)) * 0.25;
      break;
    }
    case "run": {
      const freq = 9.2;
      const cycle = timeSec * freq + phaseOffset;
      hipBobY = Math.abs(Math.sin(cycle)) * 0.14;
      torsoLeanX = 0.24;
      torsoTwistY = Math.sin(cycle) * 0.22;
      leftThighX = Math.sin(cycle) * 0.92;
      rightThighX = -Math.sin(cycle) * 0.92;
      leftShinX = Math.max(0.1, -Math.cos(cycle) * 0.95);
      rightShinX = Math.max(0.1, Math.cos(cycle) * 0.95);
      leftUpperArmX = -Math.sin(cycle) * 0.78;
      rightUpperArmX = Math.sin(cycle) * 0.78;
      leftForearmX = -0.85;
      rightForearmX = -0.85;
      break;
    }
    case "sit": {
      hipBobY = -0.36 + Math.sin(timeSec * 1.8 + phaseOffset) * 0.012;
      torsoLeanX = -0.05;
      leftThighX = -1.35;
      rightThighX = -1.35;
      leftShinX = 1.38;
      rightShinX = 1.38;
      leftUpperArmX = -0.35 - speechEnergy * 0.18;
      rightUpperArmX = -0.35 - speechEnergy * 0.22;
      leftForearmX = -0.55;
      rightForearmX = -0.55;
      break;
    }
    case "talk": {
      const cycle = timeSec * 2.4 + phaseOffset;
      hipBobY = Math.sin(cycle) * 0.015;
      torsoTwistY = Math.sin(cycle * 0.65) * 0.06;
      leftUpperArmX =
        -0.32 + Math.sin(cycle * 0.9) * (0.14 + speechEnergy * 0.12);
      rightUpperArmX =
        -0.38 + Math.cos(cycle * 0.85) * (0.16 + speechEnergy * 0.14);
      leftUpperArmZ = 0.18 + Math.sin(cycle) * 0.05;
      rightUpperArmZ = -0.20 - Math.cos(cycle) * 0.06;
      leftForearmX = -0.55 + Math.sin(cycle * 1.1) * 0.16;
      rightForearmX = -0.60 + Math.cos(cycle * 1.0) * 0.18;
      break;
    }
    case "gesture": {
      const cycle = timeSec * 2.6 + phaseOffset;
      hipBobY = Math.sin(cycle) * 0.018;
      torsoTwistY = Math.sin(cycle * 0.7) * 0.08;
      rightUpperArmX =
        -0.85 + Math.sin(cycle) * (0.20 + speechEnergy * 0.12);
      rightUpperArmZ = -0.32 + Math.cos(cycle) * 0.12;
      rightForearmX = -0.45 + Math.sin(cycle * 1.1) * 0.22;
      leftUpperArmX = -0.24 + Math.cos(cycle * 0.8) * 0.12;
      leftForearmX = -0.45;
      break;
    }
    case "type-code": {
      const cycle = timeSec * 8.0 + phaseOffset;
      hipBobY = Math.sin(timeSec * 2.5) * 0.012;
      torsoLeanX = 0.10;
      torsoTwistY = Math.sin(timeSec * 1.8) * 0.04;
      leftUpperArmX = -0.62 + Math.sin(cycle) * 0.06;
      rightUpperArmX = -0.62 + Math.cos(cycle * 1.1) * 0.06;
      leftUpperArmZ = 0.14;
      rightUpperArmZ = -0.14;
      leftForearmX = -0.82 + Math.sin(cycle * 1.4) * 0.12;
      rightForearmX = -0.82 + Math.cos(cycle * 1.5) * 0.12;
      break;
    }
    case "panic-react": {
      const cycle = timeSec * 3.4 + phaseOffset;
      hipBobY = Math.abs(Math.sin(cycle * 0.7)) * 0.022;
      torsoLeanX = -0.06 + Math.sin(cycle * 0.5) * 0.03;
      torsoTwistY = Math.sin(cycle * 0.7) * 0.08;
      leftUpperArmX = -1.35 + Math.sin(cycle) * 0.16;
      rightUpperArmX = -1.35 + Math.cos(cycle) * 0.16;
      leftUpperArmZ = 0.32;
      rightUpperArmZ = -0.32;
      leftForearmX = -0.78;
      rightForearmX = -0.78;
      break;
    }
    case "celebrate": {
      const cycle = timeSec * 3.2 + phaseOffset;
      hipBobY = Math.abs(Math.sin(cycle)) * 0.03;
      torsoLeanX = -0.05;
      torsoTwistY = Math.sin(cycle * 0.5) * 0.08;
      leftUpperArmX = -1.85 + Math.sin(cycle) * 0.18;
      rightUpperArmX = -1.85 - Math.sin(cycle) * 0.18;
      leftUpperArmZ = 0.28;
      rightUpperArmZ = -0.28;
      leftForearmX = -0.35;
      rightForearmX = -0.35;
      leftThighX = 0;
      rightThighX = 0;
      break;
    }
    case "idle":
    default: {
      const cycle = timeSec * 1.8 + phaseOffset;
      hipBobY = Math.sin(cycle) * 0.015;
      leftUpperArmX = Math.sin(cycle) * 0.04 - speechEnergy * 0.12;
      rightUpperArmX = -Math.sin(cycle) * 0.04 - speechEnergy * 0.14;
      break;
    }
  }

  const lookDx = placement.headLookAt[0] - wx;
  const lookDz = Math.max(0.85, Math.abs(placement.headLookAt[2] - wz));
  const targetYaw = Math.atan2(lookDx, lookDz) - worldRotationY * 0.5;
  const normalizedYaw = Math.atan2(Math.sin(targetYaw), Math.cos(targetYaw));
  const headYawY =
    clamp(normalizedYaw * 0.22, -0.22, 0.22) +
    Math.sin(timeSec * 1.7 + phaseOffset) * 0.04;
  const headPitchX =
    clamp((wx - placement.headLookAt[1]) * -0.02, -0.08, 0.08) +
    (placement.speaking
      ? Math.sin(timeSec * 5.2) * 0.03 + speechEnergy * 0.04
      : 0);

  const blinkCycle = (timeSec + seededRandom(seedKey + "-blink") * 3.2) % 3.2;
  const eyeBlink =
    blinkCycle > 3.04 ? Math.sin(((blinkCycle - 3.04) / 0.16) * Math.PI) : 0;

  const browRaise =
    placement.expression === "surprised"
      ? 0.65
      : placement.expression === "happy"
        ? 0.35
        : placement.speaking
          ? speechEnergy * 0.4
          : 0.1;

  return {
    worldPosition: [wx, wy, wz],
    worldRotationY,
    hipBobY,
    torsoLeanX,
    torsoTwistY,
    headYawY,
    headPitchX,
    leftThighX,
    leftShinX,
    rightThighX,
    rightShinX,
    leftUpperArmX,
    leftUpperArmZ,
    leftForearmX,
    rightUpperArmX,
    rightUpperArmZ,
    rightForearmX,
    mouthOpenness,
    mouthWidth,
    eyeBlink: clamp(eyeBlink, 0, 1),
    browRaise: clamp(browRaise, 0, 1),
  };
}

export function computeTransitionState(
  localFrame: number,
  durationInFrames: number,
  transitionType: TransitionType,
  transitionDurationFrames: number,
): {
  fadeOverlayOpacity: number;
  whipPanOffsetX: number;
  irisRadiusNormalized: number;
  enterProgress: number;
} {
  const safeTrans = clamp(
    transitionDurationFrames,
    4,
    Math.floor(durationInFrames * 0.45),
  );
  const enterProgress = smoothstep(clamp(localFrame / safeTrans, 0, 1));
  const exitStart = durationInFrames - safeTrans;
  const exitProgress =
    localFrame >= exitStart
      ? smoothstep(clamp((localFrame - exitStart) / safeTrans, 0, 1))
      : 0;

  if (transitionType === "cut") {
    return {
      fadeOverlayOpacity: 0,
      whipPanOffsetX: 0,
      irisRadiusNormalized: 1,
      enterProgress: 1,
    };
  }

  if (transitionType === "dip-to-black") {
    const enterFade = 1 - enterProgress;
    return {
      fadeOverlayOpacity: clamp(Math.max(enterFade * 0.75, exitProgress), 0, 1),
      whipPanOffsetX: 0,
      irisRadiusNormalized: 1,
      enterProgress,
    };
  }

  if (transitionType === "whip-pan") {
    return {
      fadeOverlayOpacity: exitProgress * 0.35,
      whipPanOffsetX: exitProgress * exitProgress * 120,
      irisRadiusNormalized: 1,
      enterProgress,
    };
  }

  if (transitionType === "iris-wipe") {
    return {
      fadeOverlayOpacity: 0,
      whipPanOffsetX: 0,
      irisRadiusNormalized: clamp(1 - exitProgress, 0.02, 1),
      enterProgress,
    };
  }

  return {
    fadeOverlayOpacity: clamp(exitProgress * 0.65, 0, 1),
    whipPanOffsetX: 0,
    irisRadiusNormalized: 1,
    enterProgress,
  };
}
