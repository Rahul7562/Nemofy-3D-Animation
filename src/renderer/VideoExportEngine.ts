import * as THREE from "three";
import {
  AspectRatioPreset,
  FpsPreset,
  StoryboardScene,
  StudioProject,
} from "../utils/types";
import {
  computeCameraTransformAtFrame,
  computeCharacterPoseAtFrame,
  computeSceneTimeline,
  computeTransitionState,
  getDimensionsForAspectRatio,
  seededRandom,
} from "../utils/animation-math";
import { generateProjectWavBase64 } from "../audio/procedural-audio";

export interface ExportProgressCallback {
  (status: {
    phase: "initializing" | "rendering-frames" | "encoding-mp4" | "completed";
    currentFrame: number;
    totalFrames: number;
    percent: number;
    message: string;
  }): void;
}

export interface ExportVideoOptions {
  project: StudioProject;
  aspectRatio: AspectRatioPreset;
  fps: FpsPreset;
  maxDurationSeconds?: number;
  onProgress?: ExportProgressCallback;
}

export interface ExportVideoResult {
  videoUrl: string;
  filename: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  durationSeconds: number;
  sizeBytes: number;
}

const LIGHTING_COLORS: Record<
  string,
  { sky: string; key: string; rim: string; ground: string }
> = {
  "golden-hour": {
    sky: "#0f172a",
    key: "#fbbf24",
    rim: "#f97316",
    ground: "#1e293b",
  },
  "moonlit-cobalt": {
    sky: "#020617",
    key: "#60a5fa",
    rim: "#22d3ee",
    ground: "#090d16",
  },
  "studio-three-point": {
    sky: "#0b0f19",
    key: "#fffbeb",
    rim: "#38bdf8",
    ground: "#1e293b",
  },
  "sunset-dramatic": {
    sky: "#1c1018",
    key: "#fb7185",
    rim: "#fbbf24",
    ground: "#1f122b",
  },
  "emerald-mist": {
    sky: "#041f1e",
    key: "#6ee7b7",
    rim: "#34d399",
    ground: "#022c22",
  },
};

function renderDeterministicSceneToWebGL(
  renderer: THREE.WebGLRenderer,
  scene: StoryboardScene,
  project: StudioProject,
  localFrame: number,
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
) {
  const threeScene = new THREE.Scene();
  const palette =
    LIGHTING_COLORS[scene.lightingPreset] ?? LIGHTING_COLORS["golden-hour"];

  threeScene.background = new THREE.Color(palette.sky);
  threeScene.fog = new THREE.FogExp2(palette.sky, scene.fogDensity || 0.018);

  const camState = computeCameraTransformAtFrame(
    scene,
    localFrame,
    durationInFrames,
    fps,
  );
  const camera = new THREE.PerspectiveCamera(
    camState.fov,
    width / height,
    0.1,
    180,
  );
  camera.position.set(...camState.position);
  camera.lookAt(...camState.target);
  camera.rotation.z += camState.roll;

  const hemi = new THREE.HemisphereLight(
    palette.key,
    palette.ground,
    0.9 * scene.lightIntensity,
  );
  threeScene.add(hemi);

  const keyLight = new THREE.DirectionalLight(
    palette.key,
    2.1 * scene.lightIntensity,
  );
  keyLight.position.set(6.5, 9.5, 5.5);
  threeScene.add(keyLight);

  const rimLight = new THREE.PointLight(
    palette.rim,
    16 * scene.lightIntensity,
    24,
  );
  rimLight.position.set(-4.5, 4.2, -5.0);
  threeScene.add(rimLight);

  const flatShading =
    project.brief.visualStyle === "low-poly" ||
    project.brief.visualStyle === "voxel" ||
    project.brief.visualStyle === "isometric";

  const floorGeo = new THREE.CylinderGeometry(14, 16, 0.8, 24);
  const floorMat = new THREE.MeshStandardMaterial({
    color: palette.ground,
    roughness: 0.65,
    metalness: 0.2,
    flatShading,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, -0.4, 0);
  threeScene.add(floorMesh);

  // Background architectural pillars arranged behind the stage (never blocking foreground camera)
  const bgColumns = [-4.2, -2.4, 2.4, 4.2];
  bgColumns.forEach((colX, i) => {
    const h = 2.6 + (i % 2) * 0.5;
    const propGeo =
      scene.environment === "bioluminescent-forest"
        ? new THREE.ConeGeometry(0.95, h, 7)
        : new THREE.CylinderGeometry(0.24, 0.3, h, 8);
    const propMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? "#475569" : palette.rim,
      roughness: 0.45,
      metalness: 0.3,
      flatShading,
    });
    const propMesh = new THREE.Mesh(propGeo, propMat);
    propMesh.position.set(colX, h * 0.5, -3.4 + Math.abs(colX) * 0.2);
    threeScene.add(propMesh);
  });

  // Rotating Celestial Armillary Rings & Core Crystal at [0, 2.5, -2.6]
  const timeSec = localFrame / Math.max(1, fps);
  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.065, 8, 20),
    new THREE.MeshStandardMaterial({
      color: "#F59E0B",
      roughness: 0.25,
      metalness: 0.7,
    }),
  );
  ring1.position.set(0, 2.5, -2.6);
  ring1.rotation.set(0.35, timeSec * 0.5, 0.15);
  threeScene.add(ring1);

  const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: "#38BDF8",
    emissive: "#0284C7",
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.6,
    flatShading: true,
  });
  const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
  crystalMesh.position.set(
    0,
    2.5 + Math.sin(timeSec * 2.5) * 0.15,
    -2.6,
  );
  crystalMesh.rotation.y = timeSec * 1.2;
  threeScene.add(crystalMesh);

  scene.characters.forEach((placement) => {
    const character =
      project.characters.find((c) => c.id === placement.characterId) ??
      project.characters[0];
    if (!character) return;

    const pose = computeCharacterPoseAtFrame(
      placement,
      localFrame,
      durationInFrames,
      fps,
      `${character.id}-${placement.action}`,
    );

    const charGroup = new THREE.Group();
    charGroup.position.set(
      pose.worldPosition[0],
      pose.worldPosition[1] + pose.hipBobY,
      pose.worldPosition[2],
    );
    charGroup.rotation.y = pose.worldRotationY;
    charGroup.scale.setScalar(character.scale);

    const primaryMat = new THREE.MeshStandardMaterial({
      color: character.primaryColor,
      roughness: character.roughness,
      metalness: character.metalness,
      flatShading,
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: character.secondaryColor,
      roughness: 0.45,
      metalness: 0.3,
      flatShading,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: character.accentColor,
      emissive: character.accentColor,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      flatShading,
    });

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.68, 0.34),
      primaryMat,
    );
    torso.position.set(0, 1.05, 0);
    torso.rotation.x = pose.torsoLeanX;
    torso.rotation.y = pose.torsoTwistY;
    charGroup.add(torso);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      secondaryMat,
    );
    head.position.set(0, 1.65, 0);
    head.rotation.y = pose.headYawY;
    head.rotation.x = pose.headPitchX;
    charGroup.add(head);

    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.03 + pose.mouthOpenness * 0.1, 0.06),
      accentMat,
    );
    mouth.position.set(0, 1.54 - pose.mouthOpenness * 0.02, 0.22);
    charGroup.add(mouth);

    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.56, 0.16),
      secondaryMat,
    );
    leftArm.position.set(-0.38, 1.05, 0);
    leftArm.rotation.x = pose.leftUpperArmX;
    charGroup.add(leftArm);

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.56, 0.16),
      secondaryMat,
    );
    rightArm.position.set(0.38, 1.05, 0);
    rightArm.rotation.x = pose.rightUpperArmX;
    charGroup.add(rightArm);

    const leftLeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.64, 0.2),
      primaryMat,
    );
    leftLeg.position.set(-0.15, 0.35, 0);
    leftLeg.rotation.x = pose.leftThighX;
    charGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.64, 0.2),
      primaryMat,
    );
    rightLeg.position.set(0.15, 0.35, 0);
    rightLeg.rotation.x = pose.rightThighX;
    charGroup.add(rightLeg);

    threeScene.add(charGroup);
  });

  if (scene.weatherEffect !== "none") {
    const particleGeo = new THREE.OctahedronGeometry(0.06, 0);
    const particleMat = new THREE.MeshBasicMaterial({
      color: palette.rim,
    });
    for (let p = 0; p < 28; p++) {
      const m = new THREE.Mesh(particleGeo, particleMat);
      const px = (seededRandom(`exp-px-${p}`) - 0.5) * 12;
      const py =
        ((seededRandom(`exp-py-${p}`) * 6 + (localFrame / fps) * 0.7) % 6) +
        0.4;
      const pz = (seededRandom(`exp-pz-${p}`) - 0.5) * 12;
      m.position.set(px, py, pz);
      threeScene.add(m);
    }
  }

  renderer.render(threeScene, camera);

  threeScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

export async function exportProjectToMp4({
  project,
  aspectRatio,
  fps,
  maxDurationSeconds = 5,
  onProgress,
}: ExportVideoOptions): Promise<ExportVideoResult> {
  const targetDims = getDimensionsForAspectRatio(aspectRatio);
  const scaleFactor = 0.5;
  const renderWidth = Math.round((targetDims.width * scaleFactor) / 2) * 2;
  const renderHeight = Math.round((targetDims.height * scaleFactor) / 2) * 2;

  const { timings, totalFrames: fullTotalFrames } = computeSceneTimeline(
    project.scenes,
    fps,
  );
  const maxFrames = Math.min(
    fullTotalFrames,
    Math.round(maxDurationSeconds * fps),
  );

  onProgress?.({
    phase: "initializing",
    currentFrame: 0,
    totalFrames: maxFrames,
    percent: 2,
    message: `Initializing deterministic WebGL renderer (${targetDims.width}×${targetDims.height} @ ${fps} FPS)...`,
  });

  const webglCanvas = document.createElement("canvas");
  webglCanvas.width = renderWidth;
  webglCanvas.height = renderHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(renderWidth, renderHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = renderWidth;
  compositeCanvas.height = renderHeight;
  const ctx = compositeCanvas.getContext("2d");
  if (!ctx) {
    renderer.dispose();
    throw new Error("Could not initialize 2D composite context for export.");
  }

  const framesDataUrls: string[] = [];

  for (let frame = 0; frame < maxFrames; frame++) {
    const mappedTimelineFrame = Math.min(
      fullTotalFrames - 1,
      Math.floor((frame / Math.max(1, maxFrames - 1)) * (fullTotalFrames - 1)),
    );

    let currentTiming = timings[0];
    let sceneIdx = 0;
    for (let i = 0; i < timings.length; i++) {
      const interval = timings[i];
      if (
        mappedTimelineFrame >= interval.startFrame &&
        mappedTimelineFrame < interval.endFrame
      ) {
        currentTiming = interval;
        sceneIdx = i;
        break;
      }
    }

    const localFrame = Math.max(
      0,
      mappedTimelineFrame - currentTiming.startFrame,
    );

    renderDeterministicSceneToWebGL(
      renderer,
      currentTiming.scene,
      project,
      localFrame,
      currentTiming.durationInFrames,
      fps,
      renderWidth,
      renderHeight,
    );

    ctx.clearRect(0, 0, renderWidth, renderHeight);
    ctx.drawImage(webglCanvas, 0, 0, renderWidth, renderHeight);

    ctx.fillStyle = "rgba(9, 13, 22, 0.84)";
    ctx.fillRect(16, 16, 310, 26);
    ctx.strokeStyle = "rgba(99, 102, 241, 0.5)";
    ctx.strokeRect(16, 16, 310, 26);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "600 11px monospace";
    ctx.fillText(
      `SCENE 0${sceneIdx + 1} // ${currentTiming.scene.title.toUpperCase()}`,
      26,
      33,
    );

    if (currentTiming.scene.narrationText.trim().length > 0) {
      const boxWidth = Math.min(renderWidth - 48, 560);
      const boxX = (renderWidth - boxWidth) / 2;
      const boxY = renderHeight - 64;
      ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
      ctx.fillRect(boxX, boxY, boxWidth, 42);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.45)";
      ctx.strokeRect(boxX, boxY, boxWidth, 42);

      ctx.fillStyle = "#F8FAFC";
      ctx.font = "600 13px sans-serif";
      ctx.textAlign = "center";
      const text =
        currentTiming.scene.narrationText.length > 68
          ? currentTiming.scene.narrationText.slice(0, 65) + "..."
          : currentTiming.scene.narrationText;
      ctx.fillText(`“${text}”`, renderWidth / 2, boxY + 26);
      ctx.textAlign = "left";
    }

    const trans = computeTransitionState(
      localFrame,
      currentTiming.durationInFrames,
      currentTiming.scene.transitionToNext,
      currentTiming.scene.transitionDurationFrames || 12,
    );
    if (trans.fadeOverlayOpacity > 0.02) {
      ctx.fillStyle = `rgba(6, 8, 15, ${trans.fadeOverlayOpacity.toFixed(2)})`;
      ctx.fillRect(0, 0, renderWidth, renderHeight);
    }

    framesDataUrls.push(compositeCanvas.toDataURL("image/jpeg", 0.88));

    if (frame % 5 === 0 || frame === maxFrames - 1) {
      const percent = Math.round(((frame + 1) / maxFrames) * 70) + 5;
      onProgress?.({
        phase: "rendering-frames",
        currentFrame: frame + 1,
        totalFrames: maxFrames,
        percent,
        message: `Rendered deterministic 3D frame ${frame + 1} / ${maxFrames} (${currentTiming.scene.title})`,
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  renderer.dispose();

  onProgress?.({
    phase: "encoding-mp4",
    currentFrame: maxFrames,
    totalFrames: maxFrames,
    percent: 82,
    message: `Encoding H.264 MP4 (${targetDims.width}×${targetDims.height} @ ${fps} FPS) with synthesized WAV audio via FFmpeg...`,
  });

  const wavBase64 = generateProjectWavBase64({
    ...project,
    brief: { ...project.brief, fps },
  });

  const response = await fetch("/api/render/encode-mp4", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: project.id,
      title: project.brief.title,
      fps,
      width: targetDims.width,
      height: targetDims.height,
      frames: framesDataUrls,
      wavBase64,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`FFmpeg MP4 encoding failed: ${errText}`);
  }

  const mp4Blob = await response.blob();
  const videoUrl = URL.createObjectURL(mp4Blob);
  const safeName = project.brief.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  onProgress?.({
    phase: "completed",
    currentFrame: maxFrames,
    totalFrames: maxFrames,
    percent: 100,
    message: `MP4 Render Complete (${(mp4Blob.size / 1024).toFixed(1)} KB, H.264 + AAC)`,
  });

  return {
    videoUrl,
    filename: `${safeName || "aetherframe-3d"}-${targetDims.width}x${targetDims.height}-${fps}fps.mp4`,
    width: targetDims.width,
    height: targetDims.height,
    fps,
    totalFrames: maxFrames,
    durationSeconds: Number((maxFrames / fps).toFixed(2)),
    sizeBytes: mp4Blob.size,
  };
}
