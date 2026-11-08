import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { StudioProject } from "../utils/types";
import {
  computeSceneTimeline,
  computeTransitionState,
} from "../utils/animation-math";
import { SceneComponentRegistry } from "../scenes/ModularScenes";

export interface CinematicStoryCompositionProps {
  project: StudioProject;
  activeSceneIdOverride?: string | null;
  showSubtitles?: boolean;
  showHudOverlay?: boolean;
  selectedCharacterId?: string | null;
  interactiveDirectorMode?: boolean;
}

export const CinematicStoryComposition: React.FC<
  CinematicStoryCompositionProps
> = ({
  project,
  activeSceneIdOverride = null,
  showSubtitles = true,
  showHudOverlay = true,
  selectedCharacterId = null,
  interactiveDirectorMode = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const { timings } = computeSceneTimeline(project.scenes, fps);

  let currentTiming = timings[0];
  let sceneIndex = 0;

  if (activeSceneIdOverride) {
    const foundIdx = timings.findIndex(
      (item) => item.scene.id === activeSceneIdOverride,
    );
    if (foundIdx >= 0) {
      currentTiming = timings[foundIdx];
      sceneIndex = foundIdx;
    }
  } else {
    for (let i = 0; i < timings.length; i++) {
      const interval = timings[i];
      if (frame >= interval.startFrame && frame < interval.endFrame) {
        currentTiming = interval;
        sceneIndex = i;
        break;
      }
    }
    if (
      timings.length > 0 &&
      frame >= timings[timings.length - 1].endFrame
    ) {
      currentTiming = timings[timings.length - 1];
      sceneIndex = timings.length - 1;
    }
  }

  if (!currentTiming) {
    return (
      <AbsoluteFill className="bg-slate-950 flex items-center justify-center text-slate-400">
        No scenes configured in Storyboard
      </AbsoluteFill>
    );
  }

  const localFrame = activeSceneIdOverride
    ? frame % Math.max(1, currentTiming.durationInFrames)
    : Math.max(0, frame - currentTiming.startFrame);

  const transitionState = computeTransitionState(
    localFrame,
    currentTiming.durationInFrames,
    currentTiming.scene.transitionToNext,
    currentTiming.scene.transitionDurationFrames || 12,
  );

  const subtitleOpacity = interpolate(
    localFrame,
    [
      6,
      16,
      Math.max(17, currentTiming.durationInFrames - 16),
      Math.max(18, currentTiming.durationInFrames - 5),
    ],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const SceneComponent =
    SceneComponentRegistry[currentTiming.scene.environment] ??
    SceneComponentRegistry["observatory-citadel"];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#06080F",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform:
            transitionState.whipPanOffsetX !== 0
              ? `translateX(${-transitionState.whipPanOffsetX}px)`
              : undefined,
        }}
      >
        <ThreeCanvas
          width={width}
          height={height}
          frameloop="demand"
          dpr={1}
          camera={{
            fov: currentTiming.scene.cameraFov,
            near: 0.1,
            far: 200,
          }}
        >
          <SceneComponent
            scene={currentTiming.scene}
            characters={project.characters}
            projectVisualStyle={project.brief.visualStyle}
            localFrame={localFrame}
            durationInFrames={currentTiming.durationInFrames}
            fps={fps}
            selectedCharacterId={selectedCharacterId}
            interactiveDirectorMode={interactiveDirectorMode}
          />
        </ThreeCanvas>
      </div>

      {/* Scene Slate Badge */}
      {showHudOverlay && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            backgroundColor: "rgba(9, 13, 22, 0.88)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            borderRadius: 6,
            color: "#F8FAFC",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              backgroundColor: "#6366F1",
              display: "inline-block",
            }}
          />
          <span>
            SCENE {String(sceneIndex + 1).padStart(2, "0")} //{" "}
            {currentTiming.scene.title.toUpperCase()}
          </span>
          <span style={{ color: "#38BDF8" }}>
            [{currentTiming.scene.cameraMovement.toUpperCase()}]
          </span>
        </div>
      )}

      {/* Synchronized Burned-in Subtitles */}
      {showSubtitles &&
        currentTiming.scene.narrationText.trim().length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: Math.max(24, Math.round(height * 0.06)),
              left: "8%",
              right: "8%",
              display: "flex",
              justifyContent: "center",
              opacity: subtitleOpacity,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(9, 13, 22, 0.90)",
                border: "1px solid rgba(99, 102, 241, 0.38)",
                borderRadius: 8,
                padding: "8px 16px",
                maxWidth: 720,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#38BDF8",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 2,
                }}
              >
                {currentTiming.scene.dialogueSpeaker || "Narrator"}
              </div>
              <p
                style={{
                  margin: 0,
                  color: "#F8FAFC",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: Math.max(
                    13,
                    Math.min(22, Math.round(width * 0.022)),
                  ),
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                “{currentTiming.scene.narrationText}”
              </p>
            </div>
          </div>
        )}

      {/* Deterministic Transition Overlay */}
      {transitionState.fadeOverlayOpacity > 0.01 && (
        <AbsoluteFill
          style={{
            backgroundColor: "#06080F",
            opacity: transitionState.fadeOverlayOpacity,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
