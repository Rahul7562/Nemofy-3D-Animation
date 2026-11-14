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
  dialogueVoiceId?: string;
  dialogueSpeed?: number;
  dialogueInstruct?: string;
  dialogueAudioUrl?: string | null;
  emotion: string;
  speakerAction?: string;
  listenerAction?: string;
  listenerExpression?: string;
  statusBadgeText?: string;
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

  const shots: BlenderShotManifest[] = timings.map((t, idx) => {
    const speakerName =
      t.scene.dialogueSpeaker || (idx % 2 === 0 ? "Nemo" : "Leo");
    const isNemoSpeaking = speakerName.toLowerCase().includes("nemo");
    const speakerChar = t.scene.characters.find((c) =>
      isNemoSpeaking
        ? c.characterId.includes("nemo")
        : c.characterId.includes("leo"),
    );
    const listenerChar = t.scene.characters.find((c) =>
      isNemoSpeaking
        ? c.characterId.includes("leo")
        : c.characterId.includes("nemo"),
    );

    const spkAction = speakerChar?.action || "talk";
    const spkExpr = speakerChar?.expression || "determined";
    const instructStr = (
      t.scene.dialogueInstruct ||
      speakerChar?.dialogueInstruct ||
      ""
    ).toLowerCase();

    let resolvedEmotion = `${spkExpr}-${spkAction}`;
    if (spkAction === "chin-think" || instructStr.includes("critique")) {
      resolvedEmotion = "chin-think-critique";
    } else if (spkAction === "head-scratch" || instructStr.includes("comeback")) {
      resolvedEmotion = "head-scratch-banter";
    } else if (spkAction === "facepalm-react") {
      resolvedEmotion = "facepalm-disbelief";
    } else if (spkAction === "playful-roast" || instructStr.includes("roast") || instructStr.includes("sassy")) {
      resolvedEmotion = "playful-roast-sass";
    } else if (spkAction === "energetic-wave" || instructStr.includes("energetic")) {
      resolvedEmotion = "energetic-wave-bounce";
    } else if (spkAction === "panic-react" || instructStr.includes("panic")) {
      resolvedEmotion = "panic-despair";
    } else if (instructStr.includes("stunned") || instructStr.includes("disbelief")) {
      resolvedEmotion = "stunned-disbelief";
    } else if (instructStr.includes("relief") || instructStr.includes("grateful")) {
      resolvedEmotion = "emotional-relief";
    } else if (spkAction === "celebrate" || instructStr.includes("triumphant")) {
      resolvedEmotion = "triumphant-joy";
    } else if (instructStr.includes("heroic") || instructStr.includes("proud")) {
      resolvedEmotion = "heroic-proud";
    } else if (instructStr.includes("witty") || instructStr.includes("confident")) {
      resolvedEmotion = "witty-confident";
    }

    return {
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
      dialogueSpeaker: speakerName,
      dialogueVoiceId: t.scene.dialogueVoiceId,
      dialogueSpeed: t.scene.dialogueSpeed || 1.05,
      dialogueInstruct: t.scene.dialogueInstruct,
      dialogueAudioUrl: t.scene.dialogueAudioUrl,
      emotion: resolvedEmotion,
      speakerAction: spkAction,
      listenerAction: listenerChar?.action || "idle",
      listenerExpression: listenerChar?.expression || "focused",
      statusBadgeText: t.scene.statusBadgeText,
      transitionToNext: t.scene.transitionToNext,
      lipSyncEnvelope: t.scene.dialogueLipSync || undefined,
    };
  });

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
