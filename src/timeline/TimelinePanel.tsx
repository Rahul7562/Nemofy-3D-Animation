import React from "react";
import {
  Film,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  Plus,
  Minus,
  Sparkles,
  Captions,
} from "lucide-react";
import { StudioProject } from "../utils/types";
import { computeSceneTimeline, formatTimecode } from "../utils/animation-math";

interface TimelinePanelProps {
  project: StudioProject;
  currentFrame: number;
  isPlaying: boolean;
  selectedSceneId: string;
  showSubtitles: boolean;
  onSelectScene: (sceneId: string, jumpToStartFrame: number) => void;
  onSeekFrame: (frame: number) => void;
  onTogglePlay: () => void;
  onAdjustSceneDuration: (sceneId: string, deltaSeconds: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleSubtitles: () => void;
  onAddScene: () => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  project,
  currentFrame,
  isPlaying,
  selectedSceneId,
  showSubtitles,
  onSelectScene,
  onSeekFrame,
  onTogglePlay,
  onAdjustSceneDuration,
  onToggleTrackMute,
  onToggleSubtitles,
  onAddScene,
}) => {
  const fps = project.brief.fps;
  const { timings, totalFrames } = computeSceneTimeline(project.scenes, fps);
  const playheadPercent = Math.min(
    100,
    Math.max(0, (currentFrame / Math.max(1, totalFrames)) * 100),
  );

  return (
    <section
      aria-label="Deterministic Video Timeline"
      className="h-56 bg-[#0B0F17] border-t border-slate-800/80 flex flex-col select-none shrink-0"
    >
      {/* Timeline Transport & Controls Bar */}
      <div className="h-10 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0E131F]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSeekFrame(0)}
            title="Jump to Frame 0"
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Play Sequence
              </>
            )}
          </button>
          <div className="ml-2 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-400">
            {formatTimecode(currentFrame, fps)}{" "}
            <span className="text-slate-500">
              / {formatTimecode(totalFrames, fps)} ({currentFrame}f @ {fps}fps)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSubtitles}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${
              showSubtitles
                ? "bg-indigo-950/70 border-indigo-500/50 text-indigo-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Captions className="w-3.5 h-3.5" />
            Subtitles: {showSubtitles ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={onAddScene}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" /> Add 3D Scene
          </button>
        </div>
      </div>

      {/* Multi-Track Sequencer Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers */}
        <div className="w-48 border-r border-slate-800/80 bg-[#0D111A] flex flex-col justify-between py-2 px-3 text-xs shrink-0">
          <div className="flex items-center justify-between h-12 border-b border-slate-800/50">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Film className="w-3.5 h-3.5 text-indigo-400" /> 3D Scene Track
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {project.scenes.length} shots
            </span>
          </div>

          {project.audioTracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center justify-between h-8 border-b border-slate-800/40 last:border-none"
            >
              <span className="text-slate-300 truncate flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{track.label}</span>
              </span>
              <button
                type="button"
                onClick={() => onToggleTrackMute(track.id)}
                title={track.muted ? "Unmute track" : "Mute track"}
                className={`p-1 rounded ${
                  track.muted
                    ? "bg-rose-950/60 text-rose-400"
                    : "bg-slate-900 text-emerald-400 hover:bg-slate-800"
                }`}
              >
                {track.muted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Right Timeline Ruler & Clips */}
        <div className="flex-1 relative flex flex-col py-2 px-4 overflow-x-auto bg-[#090D16]">
          {/* Interactive Frame Scrubber Bar */}
          <div
            className="h-5 mb-1.5 relative bg-slate-900/90 border border-slate-800 rounded cursor-pointer flex items-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width),
              );
              onSeekFrame(Math.round(ratio * (totalFrames - 1)));
            }}
          >
            {Array.from({ length: 11 }).map((_, idx) => {
              const pct = idx * 10;
              const frameTick = Math.round((pct / 100) * totalFrames);
              return (
                <div
                  key={idx}
                  style={{ left: `${pct}%` }}
                  className="absolute top-0 bottom-0 flex items-center pointer-events-none"
                >
                  <div className="h-2.5 w-px bg-slate-700" />
                  <span className="ml-1 font-mono text-[10px] text-slate-400">
                    {frameTick}f
                  </span>
                </div>
              );
            })}
          </div>

          {/* 3D Scene Sequence Blocks */}
          <div className="h-12 flex gap-1.5 items-stretch mb-2">
            {timings.map((item, idx) => {
              const widthPct =
                (item.durationInFrames / Math.max(1, totalFrames)) * 100;
              const isSelected = item.scene.id === selectedSceneId;
              return (
                <div
                  key={item.scene.id}
                  style={{ width: `${Math.max(12, widthPct)}%` }}
                  onClick={() => onSelectScene(item.scene.id, item.startFrame)}
                  className={`group relative rounded border px-2.5 py-1.5 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-950/80 border-indigo-500 text-white"
                      : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate">
                      {idx + 1}. {item.scene.title}
                    </span>
                    <span className="font-mono text-[10px] text-cyan-400 shrink-0">
                      {item.scene.durationInSeconds}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">
                      {item.scene.environment} • {item.scene.cameraMovement}
                    </span>
                    <div
                      className="flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onAdjustSceneDuration(item.scene.id, -1)
                        }
                        title="Shorten scene by 1s"
                        className="p-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustSceneDuration(item.scene.id, 1)}
                        title="Extend scene by 1s"
                        className="p-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audio Track Waveforms */}
          <div className="flex flex-col gap-1.5">
            {project.audioTracks.map((track, idx) => (
              <div
                key={track.id}
                className={`h-6 rounded border px-2 flex items-center justify-between ${
                  track.muted
                    ? "bg-slate-950/60 border-slate-900 text-slate-600"
                    : idx === 0
                      ? "bg-cyan-950/35 border-cyan-800/40 text-cyan-300"
                      : idx === 1
                        ? "bg-indigo-950/35 border-indigo-800/40 text-indigo-300"
                        : "bg-emerald-950/35 border-emerald-800/40 text-emerald-300"
                }`}
              >
                <span className="font-mono text-[10px] truncate">
                  {track.label}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 28 }).map((_, barIdx) => {
                    const h =
                      4 +
                      ((barIdx * 7 + idx * 13) % 11) * (track.muted ? 0.2 : 1);
                    return (
                      <span
                        key={barIdx}
                        style={{ height: `${Math.max(3, Math.round(h))}px` }}
                        className="w-1 bg-current opacity-60 rounded-xs"
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Playhead Vertical Line */}
          <div
            style={{ left: `calc(${playheadPercent}% + 16px)` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20"
          >
            <div className="w-2.5 h-2.5 -ml-1 bg-amber-400 rotate-45" />
          </div>
        </div>
      </div>
    </section>
  );
};
