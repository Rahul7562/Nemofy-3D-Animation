import { StudioProject } from "../utils/types";
import { computeSceneTimeline, seededRandom } from "../utils/animation-math";

function decodePcm16WavSamples(
  wavBytes: Uint8Array,
  targetSampleRate: number,
): Float32Array {
  if (wavBytes.byteLength < 44) return new Float32Array(0);
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
  if (riff !== "RIFF") return new Float32Array(0);

  let channels = 1;
  let sourceRate = 24000;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataLength = wavBytes.byteLength - 44;

  let offset = 12;
  while (offset + 8 <= wavBytes.byteLength) {
    const chunkId =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "fmt " && offset + 24 <= wavBytes.byteLength) {
      channels = Math.max(1, view.getUint16(offset + 10, true));
      sourceRate = Math.max(8000, view.getUint32(offset + 12, true));
      bitsPerSample = Math.max(8, view.getUint16(offset + 22, true));
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataLength = Math.min(chunkSize, wavBytes.byteLength - dataOffset);
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  const bytesPerSample = Math.max(1, Math.floor(bitsPerSample / 8));
  const frameSize = bytesPerSample * channels;
  const totalSourceFrames = Math.floor(dataLength / frameSize);
  if (totalSourceFrames <= 0) return new Float32Array(0);

  const monoSource = new Float32Array(totalSourceFrames);
  for (let i = 0; i < totalSourceFrames; i++) {
    const pos = dataOffset + i * frameSize;
    if (pos + bytesPerSample > wavBytes.byteLength) break;
    if (bitsPerSample === 16) {
      monoSource[i] = view.getInt16(pos, true) / 32768;
    } else if (bitsPerSample === 32) {
      monoSource[i] = view.getFloat32(pos, true);
    } else {
      monoSource[i] = (view.getUint8(pos) - 128) / 128;
    }
  }

  if (sourceRate === targetSampleRate) {
    return monoSource;
  }

  const targetLength = Math.floor(
    (totalSourceFrames * targetSampleRate) / sourceRate,
  );
  const resampled = new Float32Array(targetLength);
  const ratio = sourceRate / targetSampleRate;
  for (let i = 0; i < targetLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(totalSourceFrames - 1, idx0 + 1);
    const frac = srcPos - idx0;
    resampled[i] = monoSource[idx0] * (1 - frac) + monoSource[idx1] * frac;
  }
  return resampled;
}

/**
 * Generates a deterministic 16-bit PCM WAV buffer containing:
 * 1. Ambient background music harmonic progression matching the project's bgmMood
 * 2. Scene transition sound effects
 * 3. Any pre-decoded scene dialogue PCM samples (from OmniVoice through VoiceStudio or user upload)
 *
 * NOTE: Never synthesizes fake sine-wave tones as character dialogue.
 */
export function generateProjectWavBytes(
  project: StudioProject,
  sampleRate = 24000,
  sceneDialoguePcmMap?: Map<string, Float32Array>,
): Uint8Array {
  const { timings, totalFrames } = computeSceneTimeline(
    project.scenes,
    project.brief.fps,
  );
  const durationSec = Math.max(1, totalFrames / project.brief.fps);
  const numSamples = Math.floor(durationSec * sampleRate);

  const headerSize = 44;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const moodRootFreq: Record<string, number[]> = {
    "orchestral-wonder": [146.83, 220.0, 293.66, 369.99],
    "ambient-synth": [130.81, 196.0, 261.63, 311.13],
    "cinematic-pulse": [110, 164.81, 220, 277.18],
    "cyber-synth": [110, 146.83, 196.0, 220.0],
    "lofi-warmth": [196.0, 246.94, 293.66, 392.0],
  };

  const freqs =
    moodRootFreq[project.brief.bgmMood] ?? moodRootFreq["orchestral-wonder"];

  const anySolo = project.audioTracks.some((t) => Boolean(t.solo));
  const isTrackAudible = (track?: StudioProject["audioTracks"][0]) => {
    if (!track) return false;
    if (track.muted) return false;
    if (anySolo && !track.solo) return false;
    return true;
  };

  const bgmTrack = project.audioTracks.find((t) => t.type === "bgm");
  const voTrack = project.audioTracks.find((t) => t.type === "voiceover");
  const sfxTrack = project.audioTracks.find((t) => t.type === "sfx");

  const hasAnyRealDialogue = Boolean(
    sceneDialoguePcmMap && sceneDialoguePcmMap.size > 0,
  );

  // When real neural character dialogue is present, never overlay raw synthesized sine-wave hum or noise sweeps
  const bgmGain =
    isTrackAudible(bgmTrack) && !hasAnyRealDialogue
      ? bgmTrack!.volume * 0.12
      : 0;
  const voGain = isTrackAudible(voTrack) ? voTrack!.volume * 1.0 : 0;
  const sfxGain =
    isTrackAudible(sfxTrack) && !hasAnyRealDialogue
      ? sfxTrack!.volume * 0.08
      : 0;

  const computeTrackEnvelope = (
    track: StudioProject["audioTracks"][0] | undefined,
    currentFrame: number,
  ) => {
    if (!track) return 1;
    const fadeIn = Math.max(0, track.fadeInFrames ?? 0);
    const fadeOut = Math.max(0, track.fadeOutFrames ?? 0);
    let env = 1;
    if (fadeIn > 0 && currentFrame < fadeIn) {
      env *= currentFrame / fadeIn;
    }
    if (fadeOut > 0 && currentFrame > totalFrames - fadeOut) {
      env *= Math.max(0, (totalFrames - currentFrame) / fadeOut);
    }
    return env;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentFrame = t * project.brief.fps;

    const chordIdx = Math.floor(t / 2.5) % freqs.length;
    const root = freqs[chordIdx];
    const fifth = root * 1.498;
    const octave = root * 2;

    const padEnvelope =
      Math.min(1, t / 0.4) *
      Math.min(1, (durationSec - t) / 0.5) *
      computeTrackEnvelope(bgmTrack, currentFrame);

    const bgmSample =
      (Math.sin(2 * Math.PI * root * t) * 0.55 +
        Math.sin(2 * Math.PI * fifth * t) * 0.3 +
        Math.sin(2 * Math.PI * octave * t) * 0.15) *
      padEnvelope *
      bgmGain;

    let activeTiming = timings[0];
    for (let idx = 0; idx < timings.length; idx++) {
      const interval = timings[idx];
      if (
        currentFrame >= interval.startFrame &&
        currentFrame < interval.endFrame
      ) {
        activeTiming = interval;
        break;
      }
    }

    let sfxSample = 0;
    let dialogueSample = 0;

    if (activeTiming) {
      const localSec =
        (currentFrame - activeTiming.startFrame) / project.brief.fps;

      if (localSec < 0.25 && sfxGain > 0) {
        const sweepFreq = 180 + (1 - localSec / 0.25) * 160;
        const noise = seededRandom(i % 9973) * 2 - 1;
        sfxSample =
          (Math.sin(2 * Math.PI * sweepFreq * localSec) * 0.8 + noise * 0.1) *
          (1 - localSec / 0.25) *
          sfxGain *
          computeTrackEnvelope(sfxTrack, currentFrame);
      }

      if (voGain > 0 && sceneDialoguePcmMap) {
        const scenePcm = sceneDialoguePcmMap.get(activeTiming.scene.id);
        if (scenePcm && scenePcm.length > 0) {
          const sceneSampleIndex = Math.floor(localSec * sampleRate);
          if (
            sceneSampleIndex >= 0 &&
            sceneSampleIndex < scenePcm.length
          ) {
            dialogueSample =
              scenePcm[sceneSampleIndex] *
              voGain *
              computeTrackEnvelope(voTrack, currentFrame);
          }
        }
      }
    }

    // Duck BGM when real character dialogue is speaking
    const duckFactor = Math.abs(dialogueSample) > 0.01 ? 0.25 : 1.0;
    const combined = Math.max(
      -0.98,
      Math.min(0.98, bgmSample * duckFactor + sfxSample + dialogueSample),
    );
    const pcmValue = Math.floor(combined * 32767);
    view.setInt16(headerSize + i * 2, pcmValue, true);
  }

  return new Uint8Array(buffer);
}

export async function mixProjectMasterWavBytes(
  project: StudioProject,
  sampleRate = 24000,
): Promise<Uint8Array> {
  const sceneDialoguePcmMap = new Map<string, Float32Array>();

  for (const scene of project.scenes) {
    if (scene.dialogueAudioUrl) {
      try {
        const response = await fetch(scene.dialogueAudioUrl);
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          const pcm = decodePcm16WavSamples(
            new Uint8Array(arrayBuf),
            sampleRate,
          );
          if (pcm.length > 0) {
            sceneDialoguePcmMap.set(scene.id, pcm);
          }
        }
      } catch {
        // Scene dialogue URL unavailable; skip gracefully
      }
    }
  }

  return generateProjectWavBytes(project, sampleRate, sceneDialoguePcmMap);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function generateProjectWavBase64(project: StudioProject): string {
  const bytes = generateProjectWavBytes(project);
  return uint8ArrayToBase64(bytes);
}

export async function createProjectAudioBlobUrlAsync(
  project: StudioProject,
): Promise<string> {
  const bytes = await mixProjectMasterWavBytes(project);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export function createProjectAudioBlobUrl(project: StudioProject): string {
  const bytes = generateProjectWavBytes(project);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
