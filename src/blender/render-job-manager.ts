import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { ChildProcess, execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  AspectRatioPreset,
  FpsPreset,
  MediaVerificationReport,
  StudioProject,
} from "../utils/types";
import { verifyRenderedMp4WithFfprobe } from "../server/render-pipeline";
import { synthesizeSceneSpeechWithOmniVoice } from "../server/voicestudio-adapter";
import { ensureLocalVoiceStudioService } from "../server/local-voicestudio-daemon";
import {
  buildBlenderSceneFromManifest,
  BlenderSceneInspectionReport,
  renderBlenderPreviewStills,
  renderBlenderSequenceFrames,
} from "./blender-adapter";
import {
  BlenderProjectManifest,
  serializeProjectToBlenderManifest,
} from "./project-serializer";
import { archiveAnimationToWorkspace } from "../server/animation-archive";

const execFileAsync = promisify(execFile);
const PUBLIC_RENDERS_DIR = path.resolve("./public/renders");

export interface BlenderRenderJobState {
  jobId: string;
  projectName: string;
  status:
    | "building_blend"
    | "inspecting_scene"
    | "rendering_preview"
    | "rendering_frames"
    | "encoding_mp4"
    | "verifying"
    | "completed"
    | "failed"
    | "cancelled";
  progressPercent: number;
  framesCompleted: number;
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  aspectRatio: AspectRatioPreset;
  renderPreset: "draft" | "standard" | "final";
  renderEngine: "EEVEE" | "CYCLES";
  blendFileUrl: string | null;
  previewImageUrls: Array<{ frame: number; url: string }>;
  outputMp4Url: string | null;
  contactSheetUrl: string | null;
  sceneInspection: BlenderSceneInspectionReport | null;
  verification: MediaVerificationReport | null;
  logs: string[];
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface InternalBlenderJob extends BlenderRenderJobState {
  workDir: string;
  activeProcess: ChildProcess | null;
}

const blenderJobs = new Map<string, InternalBlenderJob>();

function ensurePublicRendersDir() {
  fs.mkdirSync(PUBLIC_RENDERS_DIR, { recursive: true });
}

function toPublicState(job: InternalBlenderJob): BlenderRenderJobState {
  return {
    jobId: job.jobId,
    projectName: job.projectName,
    status: job.status,
    progressPercent: job.progressPercent,
    framesCompleted: job.framesCompleted,
    totalFrames: job.totalFrames,
    fps: job.fps,
    width: job.width,
    height: job.height,
    aspectRatio: job.aspectRatio,
    renderPreset: job.renderPreset,
    renderEngine: job.renderEngine,
    blendFileUrl: job.blendFileUrl,
    previewImageUrls: job.previewImageUrls,
    outputMp4Url: job.outputMp4Url,
    contactSheetUrl: job.contactSheetUrl,
    sceneInspection: job.sceneInspection,
    verification: job.verification,
    logs: job.logs.slice(-40),
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

/**
 * Generates anescaped FFmpeg drawtext filter chain for burned-in subtitles per shot.
 */
function buildSubtitleFilterChain(manifest: BlenderProjectManifest): string {
  if (!manifest.subtitlesEnabled) return "";
  const filters: string[] = [];
  const isVertical = manifest.height > manifest.width;
  const maxLineChars = isVertical ? 38 : 62;
  const fontSize = Math.max(
    20,
    Math.round(manifest.width * (isVertical ? 0.022 : 0.021)),
  );
  const boxY = Math.round(manifest.height * (isVertical ? 0.11 : 0.80));

  for (const shot of manifest.shots) {
    if (!shot.narrationText || !shot.narrationText.trim()) continue;
    const tStart = ((shot.startFrame - 1) / manifest.fps).toFixed(2);
    const tEnd = ((shot.endFrame - 1) / manifest.fps).toFixed(2);
    const speaker = (shot.dialogueSpeaker || "Narrator").toUpperCase();
    const fullText = `${speaker}: ${shot.narrationText.trim()}`;

    // Split into up to 3 balanced lines so longer commercial dialogue never overflows horizontally
    const words = fullText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";
    for (const w of words) {
      if (!currentLine) {
        currentLine = w;
      } else if (
        currentLine.length + 1 + w.length <= maxLineChars ||
        lines.length >= 2
      ) {
        currentLine += " " + w;
      } else {
        lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);

    lines.forEach((lineText, lineIdx) => {
      const escapedText = lineText
        .replace(/\\/g, "\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "")
        .replace(/"/g, "");
      const lineY = boxY + lineIdx * Math.round(fontSize * 1.46);
      filters.push(
        `drawtext=text='${escapedText}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=0x0B0F1Dcc:boxborderw=10:x=(w-text_w)/2:y=${lineY}:enable='between(t,${tStart},${tEnd})'`,
      );
    });
  }

  return filters.join(",");
}

export async function generateBlenderPreviewForProject(params: {
  project: StudioProject;
  aspectRatio?: AspectRatioPreset;
  fps?: FpsPreset;
  renderPreset?: "draft" | "standard" | "final";
}): Promise<{
  jobId: string;
  blendFileUrl: string;
  inspection: BlenderSceneInspectionReport;
  previewImageUrls: Array<{ frame: number; url: string }>;
}> {
  ensurePublicRendersDir();
  const jobId = `blend-prev-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `af-prev-${jobId}-`));
  const publicJobDir = path.join(PUBLIC_RENDERS_DIR, jobId);
  fs.mkdirSync(publicJobDir, { recursive: true });

  try {
    const manifest = serializeProjectToBlenderManifest({
      project: params.project,
      aspectRatio: params.aspectRatio,
      fps: params.fps,
      renderPreset: params.renderPreset || "draft",
      renderEngine: "EEVEE",
    });

    const blendPath = path.join(publicJobDir, "project.blend");
    const { inspection } = await buildBlenderSceneFromManifest({
      manifest,
      workDir,
      outputBlendPath: blendPath,
    });

    const renderedStills = await renderBlenderPreviewStills({
      blendFilePath: blendPath,
      outputDir: publicJobDir,
      previewScale: 0.5,
    });

    const previewImageUrls = renderedStills.map((item) => ({
      frame: item.frame,
      url: `/renders/${jobId}/${path.basename(item.path)}`,
    }));

    return {
      jobId,
      blendFileUrl: `/renders/${jobId}/project.blend`,
      inspection,
      previewImageUrls,
    };
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export function startFullBlenderRenderJob(params: {
  project: StudioProject;
  aspectRatio?: AspectRatioPreset;
  fps?: FpsPreset;
  renderPreset?: "draft" | "standard" | "final";
  renderEngine?: "EEVEE" | "CYCLES";
  audioWavBase64?: string;
}): BlenderRenderJobState {
  ensurePublicRendersDir();
  const jobId = `blender-job-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `af-blender-${jobId}-`));
  const publicJobDir = path.join(PUBLIC_RENDERS_DIR, jobId);
  fs.mkdirSync(publicJobDir, { recursive: true });

  const manifest = serializeProjectToBlenderManifest({
    project: params.project,
    aspectRatio: params.aspectRatio,
    fps: params.fps,
    renderPreset: params.renderPreset || "final",
    renderEngine: params.renderEngine || "EEVEE",
  });

  const job: InternalBlenderJob = {
    jobId,
    projectName: manifest.projectName,
    status: "building_blend",
    progressPercent: 2,
    framesCompleted: 0,
    totalFrames: manifest.totalFrames,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    aspectRatio: manifest.aspectRatio,
    renderPreset: manifest.renderPreset,
    renderEngine: manifest.renderEngine,
    blendFileUrl: null,
    previewImageUrls: [],
    outputMp4Url: null,
    contactSheetUrl: null,
    sceneInspection: null,
    verification: null,
    logs: [`[Job ${jobId}] Starting authoritative Blender 3D pipeline...`],
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    workDir,
    activeProcess: null,
  };

  blenderJobs.set(jobId, job);

  // Execute asynchronous Blender build -> inspect -> render -> FFmpeg post-production
  void runBlenderJobPipeline(job, manifest, publicJobDir, params.audioWavBase64);

  return toPublicState(job);
}

async function runBlenderJobPipeline(
  job: InternalBlenderJob,
  manifest: BlenderProjectManifest,
  publicJobDir: string,
  audioWavBase64?: string,
): Promise<void> {
  const framesDir = path.join(job.workDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });

  try {
    // Stage 1: Build authoritative .blend project & run scene inspection
    const blendFilePath = path.join(publicJobDir, "project.blend");
    job.logs.push(
      `Building Blender .blend scene (${manifest.width}×${manifest.height} @ ${manifest.fps} FPS, ${manifest.totalFrames} frames)...`,
    );

    const { inspection } = await buildBlenderSceneFromManifest({
      manifest,
      workDir: job.workDir,
      outputBlendPath: blendFilePath,
      onLog: (line) => job.logs.push(line),
    });

    job.blendFileUrl = `/renders/${job.jobId}/project.blend`;
    job.sceneInspection = inspection;
    job.progressPercent = 10;

    if ((job.status as string) === "cancelled") return;

    // Stage 2: Render full frame sequence via Blender
    job.status = "rendering_frames";
    job.logs.push(
      `Rendering ${manifest.totalFrames} frames in Blender (${manifest.renderEngine} engine)...`,
    );

    await renderBlenderSequenceFrames({
      blendFilePath,
      framesDir,
      startFrame: 1,
      endFrame: manifest.totalFrames,
      preset: manifest.renderPreset,
      onProcess: (proc) => {
        job.activeProcess = proc;
      },
      onProgress: (frame, total) => {
        job.framesCompleted = frame;
        job.progressPercent = Math.min(86, 10 + Math.round((frame / total) * 76));
      },
      onLog: (line) => {
        if (!line.startsWith("Fra:")) {
          job.logs.push(line);
        }
      },
    });

    job.activeProcess = null;
    if ((job.status as string) === "cancelled") return;

    // Copy 4 key frames (opening chin-think, close-up roast, head-scratch reaction, final celebration) to publicJobDir for direct inspection
    const keyFrames = [
      Math.min(15, Math.max(1, Math.floor(manifest.totalFrames * 0.06))),
      Math.max(2, Math.floor(manifest.totalFrames * 0.36)),
      Math.max(3, Math.floor(manifest.totalFrames * 0.68)),
      Math.max(1, manifest.totalFrames - 8),
    ];
    const previewUrls: Array<{ frame: number; url: string }> = [];
    for (const kf of keyFrames) {
      const padded = String(kf).padStart(5, "0");
      const srcImg = path.join(framesDir, `frame_${padded}.jpg`);
      if (fs.existsSync(srcImg)) {
        const dstName = `keyframe_${padded}.jpg`;
        fs.copyFileSync(srcImg, path.join(publicJobDir, dstName));
        previewUrls.push({
          frame: kf,
          url: `/renders/${job.jobId}/${dstName}`,
        });
      }
    }
    job.previewImageUrls = previewUrls;

    // Stage 3: Post-Production Audio Muxing & H.264 MP4 Encoding via FFmpeg
    job.status = "encoding_mp4";
    job.progressPercent = 90;
    job.logs.push("Encoding H.264 (yuv420p) + AAC MP4 via FFmpeg...");

    const audioPath = path.join(job.workDir, "master_audio.wav");
    if (audioWavBase64) {
      const clean = audioWavBase64.replace(/^data:audio\/[^;]+;base64,/, "");
      fs.writeFileSync(audioPath, Buffer.from(clean, "base64"));
    } else {
      await ensureLocalVoiceStudioService();
      const durSec = Number((manifest.totalFrames / manifest.fps).toFixed(2));
      const padPath = path.join(job.workDir, "score_pad.wav");

      // 1. Generate warm, subtle stereo-style ambient harmonic chord bed (220Hz A3 + 277.18Hz C#4 + 329.63Hz E4)
      // kept at ultra-clean 4% background level so dialogue clarity is 100% front-and-center
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `aevalsrc='0.014*sin(2*PI*220*t)+0.011*sin(2*PI*277.18*t)+0.012*sin(2*PI*329.63*t)+0.008*sin(2*PI*440*t)':s=24000:d=${durSec}`,
        "-af",
        `afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0.5, durSec - 1.8).toFixed(2)}:d=1.6,lowpass=f=900`,
        padPath,
      ]);

      // 2. Synthesize character dialogue per shot via VoiceStudio / OmniVoice
      const inputArgs: string[] = ["-i", padPath];
      const filterParts: string[] = ["[0:a]volume=0.85[bg]"];
      const mixLabels: string[] = ["[bg]"];
      let inputIdx = 1;

      for (const shot of manifest.shots) {
        if (!shot.narrationText || !shot.narrationText.trim()) continue;
        try {
          const speakerLower = (shot.dialogueSpeaker || "nemo").toLowerCase();
          const voiceId =
            shot.dialogueVoiceId ||
            (speakerLower.includes("leo")
              ? "leo"
              : speakerLower.includes("kaelen")
                ? "kaelen"
                : speakerLower.includes("aria")
                  ? "aria"
                  : "nemo");

          const shotSpeed = shot.dialogueSpeed || 1.05;
          const shotInstruct =
            shot.dialogueInstruct ||
            (voiceId === "leo"
              ? "male, young adult, moderate pitch, american accent"
              : "female, young adult, moderate pitch, american accent");

          const voRes = await synthesizeSceneSpeechWithOmniVoice({
            sceneId: shot.id,
            text: shot.narrationText,
            voiceId,
            language: "en",
            speed: shotSpeed,
            instruct: shotInstruct,
          });
          const localVoPath = path.resolve(`./public${voRes.audioUrl}`);
          if (fs.existsSync(localVoPath)) {
            if (shot.dialogueAudioUrl) {
              const canonicalVoPath = path.resolve(
                `./public${shot.dialogueAudioUrl}`,
              );
              if (canonicalVoPath !== localVoPath) {
                fs.mkdirSync(path.dirname(canonicalVoPath), {
                  recursive: true,
                });
                fs.copyFileSync(localVoPath, canonicalVoPath);
              }
            }
            const delayMs = Math.max(
              0,
              Math.round(((shot.startFrame - 1) / manifest.fps + 0.04) * 1000),
            );
            const maxShotDur = Math.max(
              0.5,
              (shot.endFrame - shot.startFrame) / manifest.fps + 0.18,
            ).toFixed(2);
            inputArgs.push("-i", localVoPath);
            const lbl = `[vo${inputIdx}]`;
            filterParts.push(
              `[${inputIdx}:a]atrim=0:${maxShotDur},asetpts=PTS-STARTPTS,volume=1.14,adelay=${delayMs}|${delayMs}${lbl}`,
            );
            mixLabels.push(lbl);
            inputIdx++;
          }
        } catch (voErr) {
          job.logs.push(
            `Dialogue synthesis note for ${shot.id}: ${voErr instanceof Error ? voErr.message : String(voErr)}`,
          );
        }
      }

      if (mixLabels.length > 1) {
        filterParts.push(
          `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:normalize=0,alimiter=limit=0.96[outa]`,
        );
        await execFileAsync("ffmpeg", [
          "-y",
          ...inputArgs,
          "-filter_complex",
          filterParts.join(";"),
          "-map",
          "[outa]",
          "-ac",
          "1",
          "-ar",
          "24000",
          "-c:a",
          "pcm_s16le",
          audioPath,
        ]);
      } else {
        fs.copyFileSync(padPath, audioPath);
      }
    }

    const outputMp4Path = path.join(publicJobDir, `aetherframe-${job.jobId}.mp4`);
    const outputMp4Url = `/renders/${job.jobId}/aetherframe-${job.jobId}.mp4`;

    const subtitleFilter = buildSubtitleFilterChain(manifest);
    const vfChain = [
      "tblend=all_mode=average,tblend=all_mode=average",
      `scale=${manifest.width}:${manifest.height}:flags=lanczos`,
      subtitleFilter,
    ]
      .filter(Boolean)
      .join(",");

    await execFileAsync("ffmpeg", [
      "-y",
      "-framerate",
      String(manifest.fps),
      "-i",
      path.join(framesDir, "frame_%05d.jpg"),
      "-i",
      audioPath,
      "-vf",
      vfChain,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      outputMp4Path,
    ]);

    // Stage 4: Extract 4-Panel Contact Sheet & Verify with ffprobe
    job.status = "verifying";
    job.progressPercent = 96;

    const contactSheetPath = path.join(publicJobDir, "contact-sheet.jpg");
    let contactSheetUrl: string | null = null;
    try {
      const step = Math.max(1, Math.floor(manifest.totalFrames / 4));
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        outputMp4Path,
        "-vf",
        `select='not(mod(n\\,${step}))',scale=360:-1,tile=4x1`,
        "-frames:v",
        "1",
        contactSheetPath,
      ]);
      if (fs.existsSync(contactSheetPath)) {
        contactSheetUrl = `/renders/${job.jobId}/contact-sheet.jpg`;
      }
    } catch {
      // ignore optional contact sheet error
    }

    const verification = await verifyRenderedMp4WithFfprobe(
      outputMp4Path,
      manifest.width,
      manifest.height,
      manifest.fps,
      manifest.totalFrames,
      contactSheetUrl,
    );

    // Stage 5: Automatically Archive Completed Animation into /saved-animations/ in Workspace
    try {
      const archived = archiveAnimationToWorkspace({
        slugPrefix: `${manifest.projectId}-${job.jobId.slice(-6)}`,
        title: manifest.projectName,
        description: `Rendered ${manifest.aspectRatio} 3D animation (${verification.durationSeconds}s, ${verification.frameCount} frames @ ${verification.fps} FPS)`,
        mp4SourcePath: outputMp4Path,
        blendSourcePath: blendFilePath,
        contactSheetSourcePath: fs.existsSync(contactSheetPath)
          ? contactSheetPath
          : null,
        width: manifest.width,
        height: manifest.height,
        fps: manifest.fps,
        totalFrames: manifest.totalFrames,
        aspectRatio: manifest.aspectRatio,
        verification,
      });
      job.logs.push(
        `Saved animation to workspace archive: /${archived.folderPath}`,
      );
    } catch {
      // ignore non-fatal archive copy error
    }

    job.outputMp4Url = outputMp4Url;
    job.contactSheetUrl = contactSheetUrl;
    job.verification = verification;
    job.status = "completed";
    job.progressPercent = 100;
    job.completedAt = new Date().toISOString();
    job.logs.push(
      `Render verified: ${verification.width}×${verification.height} @ ${verification.fps} FPS (${verification.frameCount} frames, ${verification.durationSeconds}s).`,
    );
  } catch (err) {
    if ((job.status as string) !== "cancelled") {
      job.status = "failed";
      job.errorMessage = err instanceof Error ? err.message : String(err);
      job.logs.push(`ERROR: ${job.errorMessage}`);
    }
  } finally {
    job.activeProcess = null;
    try {
      fs.rmSync(job.workDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  }
}

export function getBlenderRenderJobStatus(jobId: string): BlenderRenderJobState | null {
  const job = blenderJobs.get(jobId);
  return job ? toPublicState(job) : null;
}

export function cancelBlenderRenderJob(jobId: string): BlenderRenderJobState | null {
  const job = blenderJobs.get(jobId);
  if (!job) return null;
  job.status = "cancelled";
  job.completedAt = new Date().toISOString();
  if (job.activeProcess) {
    try {
      job.activeProcess.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
  return toPublicState(job);
}
