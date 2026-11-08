import React, { useRef, useState } from "react";
import {
  Film,
  Download,
  Terminal,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ShieldCheck,
  StopCircle,
  Image as ImageIcon,
} from "lucide-react";
import { AspectRatioPreset, FpsPreset, StudioProject } from "../utils/types";
import {
  exportProjectToMp4,
  ExportVideoResult,
} from "../renderer/VideoExportEngine";
import {
  computeSceneTimeline,
  getDimensionsForAspectRatio,
} from "../utils/animation-math";

interface ExportModalProps {
  project: StudioProject;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  onClose,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>(
    project.brief.aspectRatio,
  );
  const [fps, setFps] = useState<FpsPreset>(project.brief.fps);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<{
    phase: string;
    currentFrame: number;
    totalFrames: number;
    percent: number;
    message: string;
    jobId?: string;
  } | null>(null);
  const [result, setResult] = useState<ExportVideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const targetDims = getDimensionsForAspectRatio(aspectRatio);
  const { totalFrames } = computeSceneTimeline(project.scenes, fps);
  const totalDurationSec = Number((totalFrames / fps).toFixed(1));

  const handleStartRender = async () => {
    setIsRendering(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const rendered = await exportProjectToMp4({
        project,
        aspectRatio,
        fps,
        signal: controller.signal,
        onProgress: (status) => setProgress(status),
      });
      setResult(rendered);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during MP4 encoding.",
      );
    } finally {
      setIsRendering(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRender = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="flex-1 bg-[#090D16] overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto bg-[#0E131F] border border-slate-800 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              STAGE E // UNIFIED 3D PRODUCTION RENDERING & FFMPEG + FFPROBE VERIFICATION
            </span>
            <h1 className="text-xl font-bold text-slate-100 mt-1">
              Render & Verify Full Storyboard MP4 Video (H.264 + AAC)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Renders all {project.scenes.length} storyboard scenes ({totalFrames}{" "}
              frames / {totalDurationSec}s) at native {targetDims.width}×
              {targetDims.height} resolution using chunked disk streaming, mixes
              OmniVoice dialogue & score tracks, and verifies the output MP4 via{" "}
              <code className="text-cyan-400">ffprobe</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Settings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Native Output Resolution
            </label>
            <select
              value={aspectRatio}
              disabled={isRendering}
              onChange={(e) =>
                setAspectRatio(e.target.value as AspectRatioPreset)
              }
              className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
            >
              <option value="16:9">1920 × 1080 (Landscape 16:9)</option>
              <option value="9:16">1080 × 1920 (Vertical 9:16)</option>
              <option value="1:1">1080 × 1080 (Square 1:1)</option>
            </select>
          </div>

          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Target Frame Rate
            </label>
            <select
              value={fps}
              disabled={isRendering}
              onChange={(e) => setFps(Number(e.target.value) as FpsPreset)}
              className="w-full px-2.5 py-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
            >
              <option value={30}>30 FPS (Cinematic Progressive)</option>
              <option value={60}>60 FPS (High Frame Rate)</option>
            </select>
          </div>

          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Full Timeline Span
            </span>
            <div className="font-mono text-xs text-amber-400">
              {totalFrames} Frames ({totalDurationSec}s) • {project.scenes.length}{" "}
              Scenes
            </div>
          </div>

          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Codec & Container Spec
            </span>
            <div className="font-mono text-xs text-cyan-400">
              H.264 (yuv420p) + AAC • {targetDims.width}×{targetDims.height}
            </div>
          </div>
        </div>

        {/* Primary Render Action */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-200">
              Unified Scene Graph + Chunked FFmpeg Production Pipeline
            </div>
            <div className="text-[11px] text-slate-400">
              Streams frames in 15-frame batches to disk without browser RAM
              bloat, encodes at full 1080p resolution, and validates the output
              stream with <code className="text-slate-300">ffprobe</code>.
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isRendering && (
              <button
                type="button"
                onClick={handleCancelRender}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-xs font-semibold cursor-pointer"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                <span>Cancel Job</span>
              </button>
            )}

            <button
              type="button"
              disabled={isRendering}
              onClick={handleStartRender}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Rendering ({progress?.currentFrame ?? 0}/{totalFrames})...
                  </span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Start Full Production MP4 Render</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                {progress.message}
              </span>
              <span className="font-mono text-cyan-400">
                {progress.currentFrame}/{progress.totalFrames} frames (
                {progress.percent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded overflow-hidden">
              <div
                style={{ width: `${progress.percent}%` }}
                className="h-full bg-indigo-500 transition-all duration-150"
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-rose-950/70 border border-rose-500/60 flex items-center gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Completed MP4 Video Preview, Verification Report & Contact Sheet */}
        {result && (
          <div className="p-5 rounded-lg bg-emerald-950/25 border border-emerald-500/50 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Verified Production MP4 Video Rendered Successfully
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {result.filename} • {result.width}×{result.height} @{" "}
                    {result.fps}fps • {result.totalFrames} frames (
                    {result.durationSeconds}s) •{" "}
                    {(result.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <a
                href={result.videoUrl}
                download={result.filename}
                className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download Rendered .MP4</span>
              </a>
            </div>

            {result.verification && (
              <div className="p-3.5 rounded bg-slate-950/90 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    ffprobe Media Verification Report (Job {result.jobId})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Video Codec</span>
                    <span className="text-slate-100">
                      {result.verification.videoCodec.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Audio Codec</span>
                    <span className="text-slate-100">
                      {result.verification.audioCodec.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Dimensions</span>
                    <span className="text-cyan-400">
                      {result.verification.width}×{result.verification.height}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Frame Count</span>
                    <span className="text-amber-400">
                      {result.verification.frameCount} (@{" "}
                      {result.verification.fps}fps)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Duration</span>
                    <span className="text-slate-100">
                      {result.verification.durationSeconds}s
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Stream Check</span>
                    <span className="text-emerald-400">
                      {result.verification.valid ? "PASS (H264+AAC)" : "WARN"}
                    </span>
                  </div>
                </div>

                {result.verification.contactSheetUrl && (
                  <div className="pt-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        Extracted 4-Frame Visual Contact Sheet (Early → Mid →
                        Late Frames)
                      </span>
                    </div>
                    <img
                      src={result.verification.contactSheetUrl}
                      alt="Rendered MP4 4-frame contact sheet"
                      className="w-full rounded border border-slate-800 object-contain max-h-44 bg-black"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="bg-black rounded border border-slate-800 overflow-hidden flex justify-center">
              <video
                src={result.videoUrl}
                controls
                autoPlay
                loop
                className="max-h-80 w-auto"
              />
            </div>
          </div>
        )}

        {/* Portable Remotion CLI Render Commands */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Portable Remotion CLI Render Commands</span>
          </div>
          <p className="text-xs text-slate-400">
            You can also render the registered Remotion compositions directly
            from any terminal environment with Chromium & FFmpeg:
          </p>
          <pre className="p-3 rounded bg-[#070A10] border border-slate-800/90 font-mono text-[11px] text-cyan-300 overflow-x-auto">
            {`# Render the multi-scene 3D CinematicStory composition:
npx remotion render src/index.ts CinematicStory out/cinematic-story.mp4 --gl=angle

# Render the preserved original 3D Phone Video Texture composition:
npx remotion render src/index.ts Scene out/phone-scene.mp4 --gl=angle`}
          </pre>
        </div>
      </div>
    </div>
  );
};
