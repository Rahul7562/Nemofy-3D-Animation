import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  seededRandom,
  getDimensionsForAspectRatio,
  computeSceneTimeline,
  computeCameraTransformAtFrame,
  computeCharacterPoseAtFrame,
  sanitizeOmniVoiceInstruct,
  computeDialogueAudioCacheKey,
  extractLipSyncFromWavBytes,
} from "./animation-math";
import {
  DEFAULT_STUDIO_PROJECT,
  VERTICAL_SHOWCASE_PROJECT,
} from "./default-project";
import { generateProjectWavBytes, uint8ArrayToBase64 } from "../audio/procedural-audio";
import { populateSharedStageScene3D } from "../renderer/SharedScene3DBuilder";
import {
  inspectSystemHardware,
  processUploadedDialogueAudio,
} from "../server/voicestudio-adapter";

test("seededRandom is 100% deterministic for identical seeds", () => {
  const a1 = seededRandom("aetherframe-seed-101");
  const a2 = seededRandom("aetherframe-seed-101");
  const b1 = seededRandom("aetherframe-seed-202");

  assert.equal(a1, a2);
  assert.notEqual(a1, b1);
  assert.ok(a1 >= 0 && a1 <= 1);
});

test("getDimensionsForAspectRatio returns native production 1080p dimensions", () => {
  assert.deepEqual(getDimensionsForAspectRatio("16:9"), {
    width: 1920,
    height: 1080,
  });
  assert.deepEqual(getDimensionsForAspectRatio("9:16"), {
    width: 1080,
    height: 1920,
  });
  assert.deepEqual(getDimensionsForAspectRatio("1:1"), {
    width: 1080,
    height: 1080,
  });
});

test("computeSceneTimeline preserves full storyboard duration without 3s truncation", () => {
  const { timings, totalFrames } = computeSceneTimeline(
    DEFAULT_STUDIO_PROJECT.scenes,
    30,
  );
  // 4 scenes x 4 seconds = 16 seconds = 480 frames at 30 FPS
  assert.equal(timings.length, 4);
  assert.equal(totalFrames, 480);
  assert.equal(timings[0].startFrame, 0);
  assert.equal(timings[0].endFrame, 120);
  assert.equal(timings[3].startFrame, 360);
  assert.equal(timings[3].endFrame, 480);

  // 40-second video at 30 FPS must contain 1,200 frames
  const fortySecScenes = [
    { ...DEFAULT_STUDIO_PROJECT.scenes[0], durationInSeconds: 20 },
    { ...DEFAULT_STUDIO_PROJECT.scenes[1], durationInSeconds: 20 },
  ];
  const fortyTimeline = computeSceneTimeline(fortySecScenes, 30);
  assert.equal(fortyTimeline.totalFrames, 1200);
});

test("VERTICAL_SHOWCASE_PROJECT has 300 frames (10s @ 30fps), 9:16 aspect ratio, Nemo & Leo, 3 environments, 3 camera movements", () => {
  const { timings, totalFrames } = computeSceneTimeline(
    VERTICAL_SHOWCASE_PROJECT.scenes,
    VERTICAL_SHOWCASE_PROJECT.brief.fps,
  );
  assert.equal(VERTICAL_SHOWCASE_PROJECT.brief.aspectRatio, "9:16");
  assert.equal(VERTICAL_SHOWCASE_PROJECT.brief.fps, 30);
  assert.equal(totalFrames, 300);
  assert.equal(timings.length, 3);

  const envs = new Set(VERTICAL_SHOWCASE_PROJECT.scenes.map((s) => s.environment));
  const cams = new Set(VERTICAL_SHOWCASE_PROJECT.scenes.map((s) => s.cameraMovement));
  assert.equal(envs.size, 3);
  assert.equal(cams.size, 3);

  const hasNemo = VERTICAL_SHOWCASE_PROJECT.characters.some(
    (c) => c.id === "char-nemo" && c.voiceProfile?.voiceId === "nemo",
  );
  const hasLeo = VERTICAL_SHOWCASE_PROJECT.characters.some(
    (c) => c.id === "char-leo" && c.voiceProfile?.voiceId === "leo",
  );
  assert.ok(hasNemo);
  assert.ok(hasLeo);
});

test("sanitizeOmniVoiceInstruct keeps valid OmniVoice voice-design tags and drops invalid prose", () => {
  const raw =
    "female, young adult, moderate pitch, british accent, robotic echo, super fast";
  const sanitized = sanitizeOmniVoiceInstruct(raw);
  assert.equal(
    sanitized,
    "female, young adult, moderate pitch, british accent",
  );
});

test("computeDialogueAudioCacheKey is invariant to scene lighting and changes on dialogue edit", () => {
  const key1 = computeDialogueAudioCacheKey({
    text: "After three hundred cycles, the Sunlit Observatory stands before us.",
    voiceId: "nemo",
    language: "en",
    speed: 1.0,
    instruct: "female, young adult, moderate pitch",
  });
  const key2 = computeDialogueAudioCacheKey({
    text: "After three hundred cycles, the Sunlit Observatory stands before us.",
    voiceId: "nemo",
    language: "en",
    speed: 1.0,
    instruct: "female, young adult, moderate pitch",
  });
  const keyChanged = computeDialogueAudioCacheKey({
    text: "A different line of spoken dialogue.",
    voiceId: "nemo",
    language: "en",
    speed: 1.0,
    instruct: "female, young adult, moderate pitch",
  });

  assert.equal(key1, key2);
  assert.notEqual(key1, keyChanged);
});

test("extractLipSyncFromWavBytes extracts 30Hz envelope and word timings from PCM WAV", () => {
  const sampleRate = 24000;
  const durationSec = 1.0;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const active = t >= 0.2 && t <= 0.8;
    const val = active ? Math.sin(2 * Math.PI * 220 * t) * 0.6 : 0;
    view.setInt16(44 + i * 2, Math.floor(val * 32767), true);
  }

  const { envelope, wordTimings } = extractLipSyncFromWavBytes(
    new Uint8Array(buffer),
    "Hello world from OmniVoice",
  );

  assert.ok(envelope.length >= 28);
  assert.equal(wordTimings.length, 4);
  assert.ok(envelope[0].mouthOpenness < 0.05);
  assert.ok(envelope[15].mouthOpenness > 0.25);
});

test("populateSharedStageScene3D builds complete 3D scene graphs across all 6 environments", () => {
  const environments = [
    "observatory-citadel",
    "bioluminescent-forest",
    "cyber-harbor",
    "desert-monolith",
    "floating-sanctuary",
    "minimal-studio",
  ] as const;

  for (const env of environments) {
    const threeScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.1, 200);
    const sceneConfig = {
      ...DEFAULT_STUDIO_PROJECT.scenes[0],
      environment: env,
    };

    populateSharedStageScene3D(
      threeScene,
      camera,
      sceneConfig,
      DEFAULT_STUDIO_PROJECT.characters,
      "low-poly",
      15,
      120,
      30,
      false,
    );

    let meshCount = 0;
    threeScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) meshCount++;
    });
    assert.ok(
      meshCount >= 10,
      `Environment ${env} should construct at least 10 3D meshes, got ${meshCount}`,
    );
  }
});

test("inspectSystemHardware and processUploadedDialogueAudio validate real audio and hardware", async () => {
  const hw = await inspectSystemHardware();
  assert.ok(hw.cpuCores >= 1);
  assert.ok(hw.totalRamGb > 0);
  assert.ok(
    hw.recommendedTorchVariant === "cpu" ||
      hw.recommendedTorchVariant === "cuda",
  );

  const wavBytes = generateProjectWavBytes(VERTICAL_SHOWCASE_PROJECT, 24000);
  const wavBase64 = uint8ArrayToBase64(wavBytes);
  const uploaded = await processUploadedDialogueAudio({
    sceneId: "test-scene-1",
    text: "Nemo and Leo test real FFmpeg dialogue normalization and 30Hz lip-sync extraction.",
    voiceId: "nemo",
    language: "en",
    audioBase64: wavBase64,
    fileName: "test-dialogue.wav",
  });

  assert.ok(uploaded.durationSeconds >= 9.5);
  assert.ok(uploaded.lipSync.length >= 250);
  assert.ok(uploaded.wordTimings.length >= 8);
});
