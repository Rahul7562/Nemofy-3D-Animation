import * as THREE from "three";
import {
  AspectRatioPreset,
  FpsPreset,
  MediaVerificationReport,
  StudioProject,
} from "../utils/types";
import {
  computeSceneTimeline,
  computeTransitionState,
  getDimensionsForAspectRatio,
} from "../utils/animation-math";
import {
  mixProjectMasterWavBytes,
  uint8ArrayToBase64,
} from "../audio/procedural-audio";
import {
  populateSharedStageScene3D,
  preloadProjectGltfCharacters,
} from "./SharedScene3DBuilder";
import { detectIsSoftwareGl } from "../materials/style-materials";

export interface ExportProgressCallback {
  (status: {
    phase:
      | "initializing"
      | "rendering-frames"
      | "encoding-mp4"
      | "verifying"
      | "completed";
    currentFrame: number;
    totalFrames: number;
    percent: number;
    message: string;
    jobId?: string;
  }): void;
}

export interface ExportVideoOptions {
  project: StudioProject;
  aspectRatio: AspectRatioPreset;
  fps: FpsPreset;
  signal?: AbortSignal;
  onProgress?: ExportProgressCallback;
}

export interface ExportVideoResult {
  jobId: string;
  videoUrl: string;
  filename: string;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  durationSeconds: number;
  sizeBytes: number;
  verification: MediaVerificationReport | null;
}

function collectAndDisposeFrameGeometries(
  scene: THREE.Scene,
  materialsToDisposeAtEnd: Set<THREE.Material>,
) {
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => materialsToDisposeAtEnd.add(m));
      } else if (mesh.material) {
        materialsToDisposeAtEnd.add(mesh.material);
      }
    }
  });
}

export async function exportProjectToMp4({
  project,
  aspectRatio,
  fps,
  signal,
  onProgress,
}: ExportVideoOptions): Promise<ExportVideoResult> {
  // Native 1:1 production resolution (1920x1080, 1080x1920, or 1080x1080) — never downscaled
  const targetDims = getDimensionsForAspectRatio(aspectRatio);
  const renderWidth = targetDims.width;
  const renderHeight = targetDims.height;

  const { timings, totalFrames } = computeSceneTimeline(project.scenes, fps);
  if (totalFrames <= 0 || timings.length === 0) {
    throw new Error("Project has no storyboard scenes to render.");
  }

  onProgress?.({
    phase: "initializing",
    currentFrame: 0,
    totalFrames,
    percent: 2,
    message: `Initializing production render job (${renderWidth}×${renderHeight} @ ${fps} FPS, ${totalFrames} frames)...`,
  });

  await preloadProjectGltfCharacters(project.characters);

  // 1. Start stateful server render job
  const startRes = await fetch("/api/render/jobs/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName: project.brief.title || project.name,
      fps,
      width: renderWidth,
      height: renderHeight,
      totalFrames,
      frameExtension: "jpg",
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Failed to initialize render job: ${errText}`);
  }
  const jobInfo = (await startRes.json()) as { jobId: string };
  const jobId = jobInfo.jobId;

  const webglCanvas = document.createElement("canvas");
  webglCanvas.width = renderWidth;
  webglCanvas.height = renderHeight;

  const isSoftwareGl = detectIsSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: !isSoftwareGl,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(renderWidth, renderHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = renderWidth;
  compositeCanvas.height = renderHeight;
  const ctx = compositeCanvas.getContext("2d");
  if (!ctx) {
    renderer.dispose();
    throw new Error("Could not initialize 2D composite context for export.");
  }

  const camera = new THREE.PerspectiveCamera(
    45,
    renderWidth / renderHeight,
    0.1,
    200,
  );

  const CHUNK_SIZE = 25;
  let chunkBuffer: string[] = [];
  let chunkStartFrame = 0;
  const materialsToDisposeAtEnd = new Set<THREE.Material>();

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) {
        await fetch(`/api/render/jobs/${jobId}/cancel`, { method: "POST" });
        throw new Error("Render job cancelled by user.");
      }

      let currentTiming = timings[0];
      let sceneIdx = 0;
      for (let i = 0; i < timings.length; i++) {
        const interval = timings[i];
        if (frame >= interval.startFrame && frame < interval.endFrame) {
          currentTiming = interval;
          sceneIdx = i;
          break;
        }
      }
      if (
        timings.length > 0 &&
        frame >= timings[timings.length - 1].endFrame
      ) {
        currentTiming = timings[timings.length - 1];
        sceneIdx = timings.length - 1;
      }

      const localFrame = Math.max(0, frame - currentTiming.startFrame);

      // Build unified 3D scene identical to CinematicStoryComposition
      const threeScene = new THREE.Scene();
      populateSharedStageScene3D(
        threeScene,
        camera,
        currentTiming.scene,
        project.characters,
        project.brief.visualStyle,
        localFrame,
        currentTiming.durationInFrames,
        fps,
        false,
      );

      renderer.render(threeScene, camera);
      collectAndDisposeFrameGeometries(threeScene, materialsToDisposeAtEnd);

      const trans = computeTransitionState(
        localFrame,
        currentTiming.durationInFrames,
        currentTiming.scene.transitionToNext,
        currentTiming.scene.transitionDurationFrames || 12,
      );

      ctx.fillStyle = "#06080F";
      ctx.fillRect(0, 0, renderWidth, renderHeight);
      ctx.drawImage(
        webglCanvas,
        -trans.whipPanOffsetX,
        0,
        renderWidth,
        renderHeight,
      );

      // Scene Slate Badge
      const slateW = Math.min(renderWidth - 40, 460);
      ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
      ctx.fillRect(24, 24, slateW, 36);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.strokeRect(24, 24, slateW, 36);
      ctx.fillStyle = "#6366F1";
      ctx.fillRect(36, 37, 10, 10);
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "600 14px monospace";
      ctx.fillText(
        `SCENE ${String(sceneIdx + 1).padStart(2, "0")} // ${currentTiming.scene.title.toUpperCase()} [${currentTiming.scene.cameraMovement.toUpperCase()}]`,
        54,
        47,
      );

      // Synchronized Burned-in Subtitles (matching CinematicStoryComposition)
      if (
        project.subtitlesEnabled &&
        currentTiming.scene.narrationText.trim().length > 0
      ) {
        const subBoxW = Math.min(renderWidth - 80, 880);
        const subBoxH = 76;
        const subBoxX = (renderWidth - subBoxW) / 2;
        const subBoxY = renderHeight - Math.max(48, Math.round(renderHeight * 0.06)) - subBoxH;

        ctx.fillStyle = "rgba(9, 13, 22, 0.90)";
        ctx.fillRect(subBoxX, subBoxY, subBoxW, subBoxH);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.42)";
        ctx.strokeRect(subBoxX, subBoxY, subBoxW, subBoxH);

        ctx.textAlign = "center";
        ctx.fillStyle = "#38BDF8";
        ctx.font = "600 13px monospace";
        ctx.fillText(
          (currentTiming.scene.dialogueSpeaker || "NARRATOR").toUpperCase(),
          renderWidth / 2,
          subBoxY + 24,
        );

        ctx.fillStyle = "#F8FAFC";
        const fontSize = Math.max(
          16,
          Math.min(26, Math.round(renderWidth * 0.02)),
        );
        ctx.font = `600 ${fontSize}px sans-serif`;
        const line =
          currentTiming.scene.narrationText.length > 82
            ? currentTiming.scene.narrationText.slice(0, 79) + "..."
            : currentTiming.scene.narrationText;
        ctx.fillText(`“${line}”`, renderWidth / 2, subBoxY + 54);
        ctx.textAlign = "left";
      }

      // Transition Fade Overlay
      if (trans.fadeOverlayOpacity > 0.01) {
        ctx.fillStyle = `rgba(6, 8, 15, ${trans.fadeOverlayOpacity.toFixed(3)})`;
        ctx.fillRect(0, 0, renderWidth, renderHeight);
      }

      chunkBuffer.push(compositeCanvas.toDataURL("image/jpeg", 0.92));

      if (chunkBuffer.length >= CHUNK_SIZE || frame === totalFrames - 1) {
        const chunkRes = await fetch(`/api/render/jobs/${jobId}/chunk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startFrameIndex: chunkStartFrame,
            frames: chunkBuffer,
          }),
        });
        if (!chunkRes.ok) {
          const errText = await chunkRes.text();
          throw new Error(`Chunk upload failed at frame ${frame}: ${errText}`);
        }
        chunkStartFrame = frame + 1;
        chunkBuffer = [];

        const percent = Math.round(((frame + 1) / totalFrames) * 82) + 3;
        onProgress?.({
          phase: "rendering-frames",
          currentFrame: frame + 1,
          totalFrames,
          percent,
          message: `Rendered & streamed frame ${frame + 1} / ${totalFrames} (${currentTiming.scene.title})`,
          jobId,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  } finally {
    materialsToDisposeAtEnd.forEach((m) => m.dispose());
    materialsToDisposeAtEnd.clear();
    renderer.dispose();
  }

  onProgress?.({
    phase: "encoding-mp4",
    currentFrame: totalFrames,
    totalFrames,
    percent: 88,
    message: `Mixing master audio & encoding H.264 MP4 (${renderWidth}×${renderHeight} @ ${fps} FPS) via FFmpeg...`,
    jobId,
  });

  const masterWavBytes = await mixProjectMasterWavBytes({
    ...project,
    brief: { ...project.brief, fps },
  });
  const audioWavBase64 = uint8ArrayToBase64(masterWavBytes);

  const finalizeRes = await fetch(`/api/render/jobs/${jobId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioWavBase64 }),
  });

  if (!finalizeRes.ok) {
    const errText = await finalizeRes.text();
    throw new Error(`FFmpeg MP4 finalization failed: ${errText}`);
  }

  const finalStatus = (await finalizeRes.json()) as {
    jobId: string;
    outputUrl: string;
    verification: MediaVerificationReport | null;
  };

  const safeName = (project.brief.title || project.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const sizeBytes = finalStatus.verification?.fileSizeBytes ?? 0;

  onProgress?.({
    phase: "completed",
    currentFrame: totalFrames,
    totalFrames,
    percent: 100,
    message: `Verified MP4 Render Complete (${(sizeBytes / 1024).toFixed(1)} KB, ${renderWidth}×${renderHeight} @ ${fps} FPS)`,
    jobId,
  });

  return {
    jobId,
    videoUrl: finalStatus.outputUrl,
    filename: `${safeName || "aetherframe-3d"}-${renderWidth}x${renderHeight}-${fps}fps.mp4`,
    width: renderWidth,
    height: renderHeight,
    fps,
    totalFrames,
    durationSeconds: Number((totalFrames / fps).toFixed(2)),
    sizeBytes,
    verification: finalStatus.verification,
  };
}
