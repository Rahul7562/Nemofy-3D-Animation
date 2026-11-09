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
      0,
      4,
      Math.max(17, currentTiming.durationInFrames - 10),
      Math.max(18, currentTiming.durationInFrames - 2),
    ],
    [0.96, 1, 1, 0],
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
      {showHudOverlay && !currentTiming.scene.statusBadgeText && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            backgroundColor: "rgba(9, 13, 22, 0.88)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: 8,
            color: "#F8FAFC",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: Math.max(12, Math.round(width * 0.016)),
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
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

      {/* Top-Center @agentmorphy Status Callout Pill (only standalone when subtitles are off or lower-third) */}
      {currentTiming.scene.statusBadgeText &&
        (!showSubtitles ||
          !(
            currentTiming.scene.captionStyle === "viral-reels" ||
            currentTiming.scene.environment === "agent-command-desk"
          )) && (
          <div
            style={{
              position: "absolute",
              top: 18,
              left: "6%",
              right: "6%",
              display: "flex",
              justifyContent: "center",
              opacity: subtitleOpacity,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(11, 15, 29, 0.86)",
                border:
                  currentTiming.scene.statusBadgeText.includes("98%") ||
                  currentTiming.scene.statusBadgeText.includes("🚨") ||
                  currentTiming.scene.statusBadgeText.includes("🛑") ||
                  currentTiming.scene.statusBadgeText.includes("🔥")
                    ? "1.5px solid rgba(244, 63, 94, 0.78)"
                    : "1.5px solid rgba(251, 191, 36, 0.72)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.55)",
                borderRadius: 999,
                padding: "5px 14px",
                color: "#F8FAFC",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: Math.max(10, Math.round(width * 0.016)),
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {currentTiming.scene.statusBadgeText}
            </div>
          </div>
        )}

      {/* Synchronized Burned-in Subtitles / @agentmorphy Clean Floating Upper-Middle Captions */}
      {showSubtitles &&
        currentTiming.scene.narrationText.trim().length > 0 && (() => {
          const rawText = currentTiming.scene.narrationText.trim();
          const words = rawText.split(/\s+/);
          const isViralReels =
            currentTiming.scene.captionStyle === "viral-reels" ||
            currentTiming.scene.environment === "agent-command-desk";
          const speakerName = currentTiming.scene.dialogueSpeaker || "Narrator";
          const isNemoSpeaker = speakerName.toLowerCase().includes("nemo");
          const activeWordIndex = Math.min(
            words.length - 1,
            Math.max(
              0,
              Math.floor(
                (localFrame /
                  Math.max(1, currentTiming.durationInFrames - 8)) *
                  words.length,
              ),
            ),
          );

          if (isViralReels) {
            const chunkSize = 4;
            const chunkStart =
              Math.floor(activeWordIndex / chunkSize) * chunkSize;
            const visibleWords = words.slice(chunkStart, chunkStart + chunkSize);

            return (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: "5%",
                  right: "5%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 6,
                  opacity: subtitleOpacity,
                  pointerEvents: "none",
                }}
              >
                {currentTiming.scene.statusBadgeText && (
                  <div
                    style={{
                      backgroundColor: "rgba(11, 15, 29, 0.86)",
                      border:
                        currentTiming.scene.statusBadgeText.includes("98%") ||
                        currentTiming.scene.statusBadgeText.includes("🚨") ||
                        currentTiming.scene.statusBadgeText.includes("🛑") ||
                        currentTiming.scene.statusBadgeText.includes("🔥")
                          ? "1.5px solid rgba(244, 63, 94, 0.78)"
                          : "1.5px solid rgba(251, 191, 36, 0.72)",
                      boxShadow: "0 6px 18px rgba(0, 0, 0, 0.55)",
                      borderRadius: 999,
                      padding: "4px 12px",
                      color: "#F8FAFC",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: Math.max(9, Math.round(width * 0.015)),
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      textAlign: "center",
                      maxWidth: "96%",
                    }}
                  >
                    {currentTiming.scene.statusBadgeText}
                  </div>
                )}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 10px",
                    borderRadius: 999,
                    backgroundColor: "rgba(11, 15, 29, 0.76)",
                    border: isNemoSpeaker
                      ? "1px solid rgba(224, 109, 83, 0.75)"
                      : "1px solid rgba(96, 165, 250, 0.75)",
                    color: isNemoSpeaker ? "#FDBA74" : "#93C5FD",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: Math.max(9, Math.round(width * 0.015)),
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      backgroundColor: isNemoSpeaker ? "#E06D53" : "#3B82F6",
                      display: "inline-block",
                    }}
                  />
                  <span>{speakerName}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "4px 7px",
                    maxWidth: "94%",
                    textAlign: "center",
                    fontFamily: "Plus Jakarta Sans, Inter, sans-serif",
                    fontSize: Math.max(16, Math.round(width * 0.035)),
                    fontWeight: 800,
                    lineHeight: 1.22,
                    textShadow:
                      "0 3px 14px rgba(0, 0, 0, 0.96), 0 1px 4px rgba(0, 0, 0, 0.98)",
                  }}
                >
                  {visibleWords.map((word, idxInChunk) => {
                    const wIdx = chunkStart + idxInChunk;
                    const isCurrent = wIdx === activeWordIndex;
                    const isSpoken = wIdx <= activeWordIndex;
                    return (
                      <span
                        key={wIdx}
                        style={{
                          padding: isCurrent ? "1px 8px" : "1px 3px",
                          borderRadius: 7,
                          backgroundColor: isCurrent
                            ? isNemoSpeaker
                              ? "rgba(224, 109, 83, 0.92)"
                              : "rgba(59, 91, 219, 0.92)"
                            : "transparent",
                          color: isCurrent
                            ? "#FFFFFF"
                            : isSpoken
                              ? "#FFFFFF"
                              : "rgba(226, 232, 240, 0.85)",
                          transform: isCurrent ? "scale(1.05)" : "scale(1)",
                          display: "inline-block",
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
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
                  {speakerName}
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
                  “{rawText}”
                </p>
              </div>
            </div>
          );
        })()}

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
