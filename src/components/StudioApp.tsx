import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { staticFile } from "remotion";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  AspectRatioPreset,
  CharacterConfig,
  CreativeBrief,
  FpsPreset,
  PreviewQualityProfile,
  StoryboardScene,
  StudioProject,
  VisualStyle,
  VoiceProfileConfig,
  WorkflowStage,
} from "../utils/types";
import {
  AGENTMORPHY_SKIT_PROJECT,
  DEFAULT_STUDIO_PROJECT,
  VERTICAL_SHOWCASE_PROJECT,
} from "../utils/default-project";
import {
  computeSceneTimeline,
  getDimensionsForAspectRatio,
  getPreviewDimensionsForAspectRatio,
} from "../utils/animation-math";
import { CinematicStoryComposition } from "../compositions/CinematicStoryComposition";
import { Scene } from "../Scene";
import { getMediaMetadata } from "../helpers/get-media-metadata";
import { createProjectAudioBlobUrlAsync } from "../audio/procedural-audio";
import { inspectAndValidateGLTF } from "../characters/GLTFCharacterLoader";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { RightInspector } from "./RightInspector";
import { TimelinePanel } from "../timeline/TimelinePanel";
import { CreativeBriefModal } from "./CreativeBriefModal";
import { StoryboardEditor } from "./StoryboardEditor";
import { VoiceStudioPanel } from "./VoiceStudioPanel";
import { ExportModal } from "./ExportModal";

type PhoneMediaMetadata = Awaited<ReturnType<typeof getMediaMetadata>>;

export const StudioApp: React.FC = () => {
  const [project, setProject] = useState<StudioProject>(AGENTMORPHY_SKIT_PROJECT);
  const [activeStage, setActiveStage] = useState<WorkflowStage>("stage3d");
  const [activeCompositionMode, setActiveCompositionMode] = useState<
    "cinematic" | "phone-demo"
  >("cinematic");
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    AGENTMORPHY_SKIT_PROJECT.scenes[0].id,
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    AGENTMORPHY_SKIT_PROJECT.characters[0].id,
  );
  const [isolateSelectedScene, setIsolateSelectedScene] =
    useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [phoneMetadata, setPhoneMetadata] = useState<PhoneMediaMetadata | null>(
    null,
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    const videoUrl = staticFile("phone.mp4");
    getMediaMetadata(videoUrl)
      .then((meta) => setPhoneMetadata(meta))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    createProjectAudioBlobUrlAsync(project)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setAudioBlobUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [project]);

  const fps = project.brief.fps;
  const { timings, totalFrames } = computeSceneTimeline(project.scenes, fps);
  const dims = getDimensionsForAspectRatio(project.brief.aspectRatio);
  const previewDims = getPreviewDimensionsForAspectRatio(
    project.brief.aspectRatio,
    project.previewQuality || "medium",
  );

  const selectedScene =
    project.scenes.find((s) => s.id === selectedSceneId) ?? project.scenes[0];

  const playerInputProps = useMemo(
    () => ({
      project,
      activeSceneIdOverride: isolateSelectedScene ? selectedScene.id : null,
      showSubtitles,
      showHudOverlay: true,
      selectedCharacterId,
    }),
    [
      project,
      isolateSelectedScene,
      selectedScene.id,
      showSubtitles,
      selectedCharacterId,
    ],
  );

  const lastPolledFrameRef = useRef<number>(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (playerRef.current) {
        const f = playerRef.current.getCurrentFrame();
        if (f !== lastPolledFrameRef.current) {
          lastPolledFrameRef.current = f;
          setCurrentFrame(f);
        }
      }
    }, 120);
    return () => window.clearInterval(interval);
  }, []);

  const handleSeekFrame = (frame: number) => {
    const clamped = Math.max(0, Math.min(totalFrames - 1, frame));
    setCurrentFrame(clamped);
    playerRef.current?.seekTo(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped / fps;
    }
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      if (audioRef.current) {
        audioRef.current.currentTime = currentFrame / fps;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const handleUpdateScene = (updated: StoryboardScene) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleAdjustSceneDuration = (sceneId: string, deltaSeconds: number) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              durationInSeconds: Math.max(
                2,
                Math.min(20, s.durationInSeconds + deltaSeconds),
              ),
            }
          : s,
      ),
    }));
  };

  const handleReorderScene = (sceneId: string, direction: "left" | "right") => {
    setProject((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === sceneId);
      if (idx < 0) return prev;
      const targetIdx = direction === "left" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.scenes.length) return prev;
      const next = [...prev.scenes];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return {
        ...prev,
        scenes: next.map((s, i) => ({ ...s, index: i })),
      };
    });
  };

  const handleAddScene = () => {
    const newId = `scene-${project.scenes.length + 1}-${Date.now().toString().slice(-3)}`;
    const template = project.scenes[project.scenes.length - 1];
    const newScene: StoryboardScene = {
      ...template,
      id: newId,
      index: project.scenes.length,
      title: `New Shot ${project.scenes.length + 1}`,
      durationInSeconds: 4,
      narrationText:
        "A new horizon unfolds across the deterministic 3D stage.",
    };
    setProject((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    setSelectedSceneId(newId);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    const remaining = project.scenes.filter((s) => s.id !== sceneId);
    setProject((prev) => ({ ...prev, scenes: remaining }));
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(remaining[0].id);
    }
  };

  const handleUpdateBrief = (brief: CreativeBrief) => {
    setProject((prev) => ({ ...prev, brief }));
  };

  const handleUpdateStyle = (visualStyle: VisualStyle) => {
    setProject((prev) => ({
      ...prev,
      brief: { ...prev.brief, visualStyle },
    }));
  };

  const handleUpdateAspectRatio = (aspectRatio: AspectRatioPreset) => {
    setProject((prev) => ({
      ...prev,
      brief: { ...prev.brief, aspectRatio },
    }));
  };

  const handleUpdateFps = (nextFps: FpsPreset) => {
    setProject((prev) => ({
      ...prev,
      brief: { ...prev.brief, fps: nextFps },
    }));
  };

  const handleUploadCharacterGlb = (charId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const loader = new GLTFLoader();
    loader.load(
      objectUrl,
      (gltf) => {
        const validation = inspectAndValidateGLTF(gltf, file.name, file.size);
        setProject((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === charId
              ? {
                  ...c,
                  glbUrl: objectUrl,
                  glbFileName: file.name,
                  glbValidation: validation,
                }
              : c,
          ),
        }));
      },
      undefined,
      () => {
        setProject((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === charId
              ? {
                  ...c,
                  glbUrl: null,
                  glbFileName: file.name,
                  glbValidation: {
                    valid: false,
                    fileName: file.name,
                    fileSizeBytes: file.size,
                    meshCount: 0,
                    vertexCount: 0,
                    hasSkeletalRig: false,
                    boneCount: 0,
                    animationClipNames: [],
                    hasFacialMorphTargets: false,
                    warnings: [
                      "Invalid or corrupted GLB/GLTF binary; procedural 3D rig fallback remains active.",
                    ],
                  },
                }
              : c,
          ),
        }));
      },
    );
  };

  const handleUpdateCharacter = (updated: CharacterConfig) => {
    setProject((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.id === updated.id ? updated : c,
      ),
    }));
  };

  const handleAssignCharacterVoice = (
    characterId: string,
    profile: VoiceProfileConfig,
  ) => {
    setProject((prev) => ({
      ...prev,
      characters: prev.characters.map((c) =>
        c.id === characterId ? { ...c, voiceProfile: profile } : c,
      ),
    }));
  };

  const handleAddCharacter = () => {
    const id = `char-${project.characters.length + 1}`;
    const newChar: CharacterConfig = {
      id,
      name: `Unit-0${project.characters.length + 1}`,
      role: "Support Specialist",
      archetype: "scholar-humanoid",
      description: "Articulated 3D character rig with expressive face.",
      primaryColor: "#10B981",
      secondaryColor: "#1E293B",
      accentColor: "#38BDF8",
      skinOrChassisColor: "#ecc1a1",
      scale: 1,
      roughness: 0.35,
      metalness: 0.25,
      glbUrl: null,
      glbFileName: null,
    };
    setProject((prev) => ({
      ...prev,
      characters: [...prev.characters, newChar],
    }));
    setSelectedCharacterId(id);
  };

  const handleToggleTrackMute = (trackId: string) => {
    setProject((prev) => ({
      ...prev,
      audioTracks: prev.audioTracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t,
      ),
    }));
  };

  const handleToggleTrackSolo = (trackId: string) => {
    setProject((prev) => ({
      ...prev,
      audioTracks: prev.audioTracks.map((t) =>
        t.id === trackId ? { ...t, solo: !t.solo } : t,
      ),
    }));
  };

  const handleChangeTrackVolume = (trackId: string, volume: number) => {
    setProject((prev) => ({
      ...prev,
      audioTracks: prev.audioTracks.map((t) =>
        t.id === trackId ? { ...t, volume } : t,
      ),
    }));
  };

  const handleChangePreviewQuality = (previewQuality: PreviewQualityProfile) => {
    setProject((prev) => ({ ...prev, previewQuality }));
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#090D16] text-slate-100">
      {audioBlobUrl && <audio ref={audioRef} src={audioBlobUrl} hidden />}

      <TopBar
        projectTitle={project.brief.title}
        activeStage={activeStage}
        onSelectStage={setActiveStage}
        onOpenExport={() => setActiveStage("export")}
        activeProjectId={project.id}
        onSelectPresetProject={(nextProject) => {
          setProject(nextProject);
          setSelectedSceneId(nextProject.scenes[0].id);
          setSelectedCharacterId(nextProject.characters[0].id);
          handleSeekFrame(0);
        }}
        onLoadVerticalShowcase={() => {
          setProject(VERTICAL_SHOWCASE_PROJECT);
          setSelectedSceneId(VERTICAL_SHOWCASE_PROJECT.scenes[0].id);
          handleSeekFrame(0);
        }}
        onLoadDefaultProject={() => {
          setProject(DEFAULT_STUDIO_PROJECT);
          setSelectedSceneId(DEFAULT_STUDIO_PROJECT.scenes[0].id);
          handleSeekFrame(0);
        }}
      />

      {activeStage === "brief" && (
        <CreativeBriefModal
          project={project}
          onUpdateBrief={handleUpdateBrief}
          onApplyGeneratedStoryboard={(brief, scenes) => {
            setProject((prev) => ({ ...prev, brief, scenes }));
            setSelectedSceneId(scenes[0].id);
            setActiveStage("storyboard");
          }}
          onProceedToStoryboard={() => setActiveStage("storyboard")}
        />
      )}

      {activeStage === "storyboard" && (
        <StoryboardEditor
          project={project}
          onUpdateScene={handleUpdateScene}
          onAddScene={handleAddScene}
          onDeleteScene={handleDeleteScene}
          onApproveStoryboard={() => setActiveStage("stage3d")}
        />
      )}

      {activeStage === "voicestudio" && (
        <VoiceStudioPanel
          project={project}
          onUpdateScene={handleUpdateScene}
          onAssignCharacterVoice={handleAssignCharacterVoice}
        />
      )}

      {activeStage === "export" && (
        <ExportModal
          project={project}
          onClose={() => setActiveStage("stage3d")}
        />
      )}

      {(activeStage === "stage3d" || activeStage === "timeline") && (
        <>
          <div className="flex-1 flex overflow-hidden min-h-0">
            <LeftSidebar
              project={project}
              selectedSceneId={selectedScene.id}
              selectedCharacterId={selectedCharacterId}
              activeCompositionMode={activeCompositionMode}
              onSelectCompositionMode={setActiveCompositionMode}
              onSelectScene={(sceneId) => {
                setSelectedSceneId(sceneId);
                const found = timings.find((i) => i.scene.id === sceneId);
                if (found) {
                  handleSeekFrame(found.startFrame);
                }
              }}
              onSelectCharacter={setSelectedCharacterId}
              onUpdateStyle={handleUpdateStyle}
              onUpdateAspectRatio={handleUpdateAspectRatio}
              onUpdateFps={handleUpdateFps}
              onUploadCharacterGlb={handleUploadCharacterGlb}
              onUpdateCharacter={handleUpdateCharacter}
              onAddCharacter={handleAddCharacter}
              onDeleteScene={handleDeleteScene}
            />

            {/* Center 3D Viewport & Remotion Player Canvas */}
            <main className="flex-1 flex flex-col bg-[#06080F] relative overflow-hidden">
              {/* Viewport Mode Sub-bar */}
              <div className="h-9 px-4 bg-[#0B0F17] border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-indigo-400 font-semibold">
                    {activeCompositionMode === "cinematic"
                      ? `REMOTION THREECANVAS // ${dims.width}×${dims.height} @ ${fps}FPS (${totalFrames}f)`
                      : "ORIGINAL STARTER // SCENE (PHONE VIDEO TEXTURE)"}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">
                    Style:{" "}
                    <strong className="text-white uppercase">
                      {project.brief.visualStyle}
                    </strong>
                  </span>
                </div>

                {activeCompositionMode === "cinematic" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsolateSelectedScene((v) => !v)}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${
                        isolateSelectedScene
                          ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {isolateSelectedScene
                        ? `Looping Scene: ${selectedScene.title}`
                        : "Playing Full Multi-Scene Sequence"}
                    </button>
                  </div>
                )}
              </div>

              {/* Remotion Player Container */}
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div
                  style={{
                    aspectRatio: `${dims.width} / ${dims.height}`,
                    maxHeight: "100%",
                    maxWidth: "100%",
                  }}
                  className="h-full rounded-md overflow-hidden border border-slate-800 shadow-2xl bg-black flex items-center justify-center"
                >
                  {activeCompositionMode === "cinematic" ? (
                    <Player
                      ref={playerRef}
                      component={CinematicStoryComposition}
                      inputProps={playerInputProps}
                      durationInFrames={Math.max(1, totalFrames)}
                      compositionWidth={previewDims.width}
                      compositionHeight={previewDims.height}
                      fps={fps}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      controls={false}
                      loop
                      acknowledgeRemotionLicense
                    />
                  ) : phoneMetadata ? (
                    <Player
                      component={Scene}
                      inputProps={{
                        deviceType: "phone",
                        phoneColor: "rgb(110, 152, 191)",
                        baseScale: 1,
                        mediaMetadata: phoneMetadata,
                        videoSrc: staticFile("phone.mp4"),
                      }}
                      durationInFrames={300}
                      compositionWidth={640}
                      compositionHeight={360}
                      fps={30}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      controls
                      loop
                      acknowledgeRemotionLicense
                    />
                  ) : (
                    <div className="text-xs text-slate-400 font-mono p-8">
                      Loading 3D Phone Video Texture metadata...
                    </div>
                  )}
                </div>
              </div>
            </main>

            <RightInspector
              project={project}
              selectedScene={selectedScene}
              onUpdateScene={handleUpdateScene}
              onOpenVoiceStudio={() => setActiveStage("voicestudio")}
            />
          </div>

          <TimelinePanel
            project={project}
            currentFrame={currentFrame}
            isPlaying={isPlaying}
            selectedSceneId={selectedScene.id}
            showSubtitles={showSubtitles}
            onSelectScene={(sceneId, startFrame) => {
              setSelectedSceneId(sceneId);
              handleSeekFrame(startFrame);
            }}
            onSeekFrame={handleSeekFrame}
            onTogglePlay={handleTogglePlay}
            onAdjustSceneDuration={handleAdjustSceneDuration}
            onReorderScene={handleReorderScene}
            onToggleTrackMute={handleToggleTrackMute}
            onToggleTrackSolo={handleToggleTrackSolo}
            onChangeTrackVolume={handleChangeTrackVolume}
            onChangePreviewQuality={handleChangePreviewQuality}
            onToggleSubtitles={() => setShowSubtitles((s) => !s)}
            onAddScene={handleAddScene}
          />
        </>
      )}
    </div>
  );
};
