import {
  AspectRatioPreset,
  CameraTransformState,
  CharacterJointPose,
  ComputedSceneTiming,
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
): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16":
      return { width: 360, height: 640 };
    case "1:1":
      return { width: 480, height: 480 };
    case "16:9":
    default:
      return { width: 640, height: 360 };
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
      px = lerp(sx * 1.15, ex * 1.05, eased);
      py = lerp(Math.max(sy, 4.2), Math.max(ey, 3.6), eased);
      pz = lerp(sz * 1.15, ez * 1.05, eased);
      fov = Math.max(46, scene.cameraFov);
      break;
    }
    case "close-up": {
      const focusChar = scene.characters[0];
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

export function computeLipSyncAtFrame(
  dialogueLine: string,
  speaking: boolean,
  localFrame: number,
  durationInFrames: number,
  fps: number,
): { mouthOpenness: number; mouthWidth: number } {
  if (!speaking || !dialogueLine || dialogueLine.trim().length === 0) {
    return { mouthOpenness: 0.04, mouthWidth: 0.5 };
  }

  const startSpeak = Math.floor(durationInFrames * 0.08);
  const endSpeak = Math.ceil(durationInFrames * 0.9);
  if (localFrame < startSpeak || localFrame > endSpeak) {
    return { mouthOpenness: 0.04, mouthWidth: 0.5 };
  }

  const speakSpan = Math.max(1, endSpeak - startSpeak);
  const progress = clamp((localFrame - startSpeak) / speakSpan, 0, 1);
  const cleanText = dialogueLine.trim();
  const charIdx = Math.min(
    cleanText.length - 1,
    Math.floor(progress * cleanText.length),
  );
  const ch = cleanText[charIdx]?.toLowerCase() ?? " ";

  const timeSec = localFrame / Math.max(1, fps);
  const syllableWave = (Math.sin(timeSec * 40) + 1) * 0.5;

  if ("aou".includes(ch)) {
    return {
      mouthOpenness: clamp(0.45 + syllableWave * 0.5, 0.15, 0.95),
      mouthWidth: 0.42,
    };
  }
  if ("ei".includes(ch)) {
    return {
      mouthOpenness: clamp(0.3 + syllableWave * 0.38, 0.12, 0.78),
      mouthWidth: 0.78,
    };
  }
  if ("bmp".includes(ch)) {
    return {
      mouthOpenness: 0.05,
      mouthWidth: 0.48,
    };
  }
  if ("fvsz".includes(ch)) {
    return {
      mouthOpenness: 0.18 + syllableWave * 0.15,
      mouthWidth: 0.65,
    };
  }
  if (ch === " " || ".,!?;:".includes(ch)) {
    return {
      mouthOpenness: 0.06,
      mouthWidth: 0.5,
    };
  }

  return {
    mouthOpenness: clamp(0.22 + syllableWave * 0.35, 0.08, 0.7),
    mouthWidth: 0.55,
  };
}

export function computeCharacterPoseAtFrame(
  placement: SceneCharacterPlacement,
  localFrame: number,
  durationInFrames: number,
  fps: number,
  seedKey: string,
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
      leftUpperArmX = -0.35;
      rightUpperArmX = -0.35;
      leftForearmX = -0.55;
      rightForearmX = -0.55;
      break;
    }
    case "talk": {
      const cycle = timeSec * 3.4 + phaseOffset;
      hipBobY = Math.sin(cycle) * 0.03;
      torsoTwistY = Math.sin(cycle * 0.7) * 0.14;
      leftUpperArmX = -0.35 + Math.sin(cycle * 1.2) * 0.28;
      rightUpperArmX = -0.45 + Math.cos(cycle * 1.1) * 0.34;
      leftUpperArmZ = 0.22 + Math.sin(cycle) * 0.08;
      rightUpperArmZ = -0.24 - Math.cos(cycle) * 0.1;
      leftForearmX = -0.65 + Math.sin(cycle * 1.5) * 0.25;
      rightForearmX = -0.72 + Math.cos(cycle * 1.4) * 0.28;
      break;
    }
    case "gesture": {
      const cycle = timeSec * 4.0 + phaseOffset;
      hipBobY = Math.sin(cycle) * 0.04;
      torsoTwistY = Math.sin(cycle * 0.8) * 0.2;
      rightUpperArmX = -1.15 + Math.sin(cycle) * 0.35;
      rightUpperArmZ = -0.45 + Math.cos(cycle) * 0.2;
      rightForearmX = -0.45 + Math.sin(cycle * 1.5) * 0.35;
      leftUpperArmX = -0.28 + Math.cos(cycle * 0.9) * 0.2;
      leftForearmX = -0.5;
      break;
    }
    case "idle":
    default: {
      const cycle = timeSec * 2.0 + phaseOffset;
      hipBobY = Math.sin(cycle) * 0.025;
      leftUpperArmX = Math.sin(cycle) * 0.06;
      rightUpperArmX = -Math.sin(cycle) * 0.06;
      break;
    }
  }

  const lookDx = placement.headLookAt[0] - wx;
  const lookDz = placement.headLookAt[2] - wz;
  const targetYaw = Math.atan2(lookDx, lookDz) - worldRotationY;
  const normalizedYaw = Math.atan2(Math.sin(targetYaw), Math.cos(targetYaw));
  const headYawY =
    clamp(normalizedYaw * 0.55, -0.65, 0.65) +
    Math.sin(timeSec * 1.7 + phaseOffset) * 0.08;
  const headPitchX =
    clamp((wx - placement.headLookAt[1]) * -0.05, -0.3, 0.3) +
    (placement.speaking ? Math.sin(timeSec * 5.2) * 0.06 : 0);

  const blinkCycle = (timeSec + seededRandom(seedKey + "-blink") * 3.2) % 3.2;
  const eyeBlink =
    blinkCycle > 3.04 ? Math.sin(((blinkCycle - 3.04) / 0.16) * Math.PI) : 0;

  const { mouthOpenness, mouthWidth } = computeLipSyncAtFrame(
    placement.dialogueLine,
    placement.speaking,
    localFrame,
    durationInFrames,
    fps,
  );

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
