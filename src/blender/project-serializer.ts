import {
  AspectRatioPreset,
  FpsPreset,
  LipSyncEnvelopePoint,
  StudioProject,
} from "../utils/types";
import {
  computeSceneTimeline,
  getDimensionsForAspectRatio,
} from "../utils/animation-math";

export interface BlenderShotManifest {
  id: string;
  shotId: string;
  shotIndex: number;
  title: string;
  durationSeconds: number;
  startFrame: number;
  endFrame: number;
  environment: string;
  cameraMovement: string;
  cameraFov: number;
  lightingPreset: string;
  narrationText: string;
  dialogueSpeaker: string;
  emotion: string;
  transitionToNext: string;
  lipSyncEnvelope?: LipSyncEnvelopePoint[];
}

export interface BlenderProjectManifest {
  projectId: string;
  projectName: string;
  aspectRatio: AspectRatioPreset;
  width: number;
  height: number;
  fps: FpsPreset;
  totalFrames: number;
  totalDurationSeconds: number;
  renderPreset: "draft" | "standard" | "final";
  renderEngine: "EEVEE" | "CYCLES";
  subtitlesEnabled: boolean;
  characters: Array<{
    id: string;
    name: string;
    archetype: string;
    primaryColor: string;
    secondaryColor: string;
    glbFilePath?: string | null;
  }>;
  shots: BlenderShotManifest[];
}

export function serializeProjectToBlenderManifest(params: {
  project: StudioProject;
  aspectRatio?: AspectRatioPreset;
  fps?: FpsPreset;
  renderPreset?: "draft" | "standard" | "final";
  renderEngine?: "EEVEE" | "CYCLES";
}): BlenderProjectManifest {
  const { project } = params;
  const aspectRatio = params.aspectRatio || project.brief.aspectRatio || "9:16";
  const fps = params.fps || project.brief.fps || 30;
  const renderPreset = params.renderPreset || "final";
  const renderEngine = params.renderEngine || "EEVEE";

  const baseDims = getDimensionsForAspectRatio(aspectRatio);
  const width = baseDims.width;
  const height = baseDims.height;

  const { timings, totalFrames, totalDurationSeconds } = computeSceneTimeline(
    project.scenes,
    fps,
  );

  const shots: BlenderShotManifest[] = timings.map((t, idx) => ({
    id: t.scene.id,
    shotId: t.scene.id,
    shotIndex: idx,
    title: t.scene.title,
    durationSeconds: t.scene.durationInSeconds,
    startFrame: t.startFrame + 1,
    endFrame: Math.min(totalFrames, t.endFrame + 1),
    environment: t.scene.environment,
    cameraMovement: t.scene.cameraMovement,
    cameraFov: t.scene.cameraFov,
    lightingPreset: t.scene.lightingPreset,
    narrationText: t.scene.narrationText,
    dialogueSpeaker:
      t.scene.dialogueSpeaker || (idx % 2 === 0 ? "Nemo" : "Leo"),
    emotion: idx === 0 ? "curious" : idx === 1 ? "excited" : "warm-smile",
    transitionToNext: t.scene.transitionToNext,
    lipSyncEnvelope: t.scene.dialogueLipSync || undefined,
  }));

  return {
    projectId: project.id,
    projectName: project.brief.title || project.name,
    aspectRatio,
    width,
    height,
    fps,
    totalFrames,
    totalDurationSeconds,
    renderPreset,
    renderEngine,
    subtitlesEnabled: project.subtitlesEnabled,
    characters: project.characters.map((c) => ({
      id: c.id,
      name: c.name,
      archetype: c.archetype,
      primaryColor: c.primaryColor,
      secondaryColor: c.secondaryColor,
      glbFilePath: null,
    })),
    shots,
  };
}
