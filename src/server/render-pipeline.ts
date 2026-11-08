import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MediaVerificationReport, RenderJobStatus } from "../utils/types";

const execFileAsync = promisify(execFile);

interface InternalRenderJob extends RenderJobStatus {
  workDir: string;
  frameExtension: "jpg" | "png";
}

const activeRenderJobs = new Map<string, InternalRenderJob>();
const PUBLIC_RENDERS_DIR = path.resolve("./public/renders");

function ensureRendersDir() {
  fs.mkdirSync(PUBLIC_RENDERS_DIR, { recursive: true });
}

export function startRenderJob(params: {
  projectName: string;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  frameExtension?: "jpg" | "png";
}): RenderJobStatus {
  ensureRendersDir();
  const jobId = `job-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const workDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `aetherframe-${jobId}-`),
  );

  const job: InternalRenderJob = {
    jobId,
    status: "rendering_frames",
    progressPercent: 0,
    framesCompleted: 0,
    totalFrames: Math.max(1, params.totalFrames),
    fps: params.fps || 30,
    width: params.width || 1920,
    height: params.height || 1080,
    startedAt: new Date().toISOString(),
    completedAt: null,
    errorMessage: null,
    outputUrl: null,
    verification: null,
    workDir,
    frameExtension: params.frameExtension || "jpg",
  };

  activeRenderJobs.set(jobId, job);
  return stripInternalJob(job);
}

export function getRenderJobStatus(jobId: string): RenderJobStatus | null {
  const job = activeRenderJobs.get(jobId);
  return job ? stripInternalJob(job) : null;
}

export function appendRenderChunk(params: {
  jobId: string;
  startFrameIndex: number;
  frames: string[];
}): RenderJobStatus {
  const job = activeRenderJobs.get(params.jobId);
  if (!job) {
    throw new Error(`Render job ${params.jobId} not found.`);
  }
  if (job.status === "cancelled") {
    throw new Error(`Render job ${params.jobId} was cancelled.`);
  }

  for (let i = 0; i < params.frames.length; i++) {
    const frameIndex1Based = params.startFrameIndex + i + 1;
    const rawDataUrl = params.frames[i];
    if (rawDataUrl.startsWith("data:image/png")) {
      job.frameExtension = "png";
    } else if (rawDataUrl.startsWith("data:image/jpeg")) {
      job.frameExtension = "jpg";
    }
    const base64Data = rawDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const padded = String(frameIndex1Based).padStart(5, "0");
    const framePath = path.join(
      job.workDir,
      `frame_${padded}.${job.frameExtension}`,
    );
    fs.writeFileSync(framePath, Buffer.from(base64Data, "base64"));
  }

  job.framesCompleted = Math.min(
    job.totalFrames,
    Math.max(
      job.framesCompleted,
      params.startFrameIndex + params.frames.length,
    ),
  );
  job.progressPercent = Math.min(
    85,
    Math.round((job.framesCompleted / job.totalFrames) * 85),
  );

  return stripInternalJob(job);
}

export async function verifyRenderedMp4WithFfprobe(
  mp4Path: string,
  expectedWidth: number,
  expectedHeight: number,
  expectedFps: number,
  expectedFrames: number,
  contactSheetUrl: string | null = null,
): Promise<MediaVerificationReport> {
  if (!fs.existsSync(mp4Path)) {
    return {
      valid: false,
      containerFormat: "missing",
      videoCodec: "none",
      audioCodec: "none",
      width: 0,
      height: 0,
      fps: 0,
      durationSeconds: 0,
      frameCount: 0,
      fileSizeBytes: 0,
      hasAudioStream: false,
      contactSheetUrl: null,
    };
  }

  const stat = fs.statSync(mp4Path);
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    mp4Path,
  ]);

  const parsed = JSON.parse(stdout) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
      nb_frames?: string;
      duration?: string;
    }>;
    format?: {
      format_name?: string;
      duration?: string;
      size?: string;
    };
  };

  const streams = parsed.streams || [];
  const videoStream = streams.find((s) => s.codec_type === "video");
  const audioStream = streams.find((s) => s.codec_type === "audio");

  const width = videoStream?.width ?? 0;
  const height = videoStream?.height ?? 0;
  const videoCodec = videoStream?.codec_name ?? "unknown";
  const audioCodec = audioStream?.codec_name ?? "none";

  let fps = expectedFps;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    if (num && den) {
      fps = Math.round(num / den);
    }
  }

  const durationSeconds = Number(
    parseFloat(
      videoStream?.duration || parsed.format?.duration || "0",
    ).toFixed(2),
  );
  const frameCount = videoStream?.nb_frames
    ? parseInt(videoStream.nb_frames, 10)
    : Math.round(durationSeconds * fps);

  const valid =
    stat.size > 1000 &&
    videoCodec === "h264" &&
    width === expectedWidth &&
    height === expectedHeight &&
    Math.abs(frameCount - expectedFrames) <= 2 &&
    Boolean(audioStream);

  return {
    valid,
    containerFormat: parsed.format?.format_name || "mov,mp4",
    videoCodec,
    audioCodec,
    width,
    height,
    fps,
    durationSeconds,
    frameCount,
    fileSizeBytes: stat.size,
    hasAudioStream: Boolean(audioStream),
    contactSheetUrl,
  };
}

export async function finalizeRenderJob(params: {
  jobId: string;
  audioWavBase64: string;
}): Promise<RenderJobStatus> {
  ensureRendersDir();
  const job = activeRenderJobs.get(params.jobId);
  if (!job) {
    throw new Error(`Render job ${params.jobId} not found.`);
  }
  if (job.status === "cancelled") {
    throw new Error(`Render job ${params.jobId} was cancelled.`);
  }

  try {
    job.status = "encoding_mp4";
    job.progressPercent = 88;

    const audioPath = path.join(job.workDir, "audio.wav");
    const cleanAudio = params.audioWavBase64.replace(
      /^data:audio\/[^;]+;base64,/,
      "",
    );
    fs.writeFileSync(audioPath, Buffer.from(cleanAudio, "base64"));

    const outputFileName = `aetherframe-${job.jobId}.mp4`;
    const publicMp4Path = path.join(PUBLIC_RENDERS_DIR, outputFileName);
    const publicMp4Url = `/renders/${outputFileName}`;

    // Ensure even dimensions for yuv420p H.264
    const targetW = job.width % 2 === 0 ? job.width : job.width - 1;
    const targetH = job.height % 2 === 0 ? job.height : job.height - 1;

    await execFileAsync("ffmpeg", [
      "-y",
      "-framerate",
      String(job.fps),
      "-i",
      path.join(job.workDir, `frame_%05d.${job.frameExtension}`),
      "-i",
      audioPath,
      "-vf",
      `scale=${targetW}:${targetH}:flags=lanczos`,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      publicMp4Path,
    ]);

    job.status = "verifying";
    job.progressPercent = 95;

    // Generate a 4-panel contact sheet from early, mid-early, mid-late, and late frames
    const contactSheetName = `contact-${job.jobId}.jpg`;
    const contactSheetPath = path.join(PUBLIC_RENDERS_DIR, contactSheetName);
    let contactSheetUrl: string | null = null;

    try {
      const step = Math.max(1, Math.floor(job.totalFrames / 4));
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        publicMp4Path,
        "-vf",
        `select='not(mod(n\\,${step}))',scale=320:-1,tile=4x1`,
        "-frames:v",
        "1",
        contactSheetPath,
      ]);
      if (fs.existsSync(contactSheetPath)) {
        contactSheetUrl = `/renders/${contactSheetName}`;
      }
    } catch {
      // Optional contact sheet
    }

    const verification = await verifyRenderedMp4WithFfprobe(
      publicMp4Path,
      targetW,
      targetH,
      job.fps,
      job.totalFrames,
      contactSheetUrl,
    );

    job.verification = verification;
    job.outputUrl = publicMp4Url;
    job.status = "completed";
    job.progressPercent = 100;
    job.completedAt = new Date().toISOString();

    return stripInternalJob(job);
  } catch (err) {
    job.status = "failed";
    job.errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    try {
      fs.rmSync(job.workDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export function cancelRenderJob(jobId: string): RenderJobStatus | null {
  const job = activeRenderJobs.get(jobId);
  if (!job) return null;
  job.status = "cancelled";
  job.completedAt = new Date().toISOString();
  try {
    fs.rmSync(job.workDir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
  return stripInternalJob(job);
}

function stripInternalJob(job: InternalRenderJob): RenderJobStatus {
  return {
    jobId: job.jobId,
    status: job.status,
    progressPercent: job.progressPercent,
    framesCompleted: job.framesCompleted,
    totalFrames: job.totalFrames,
    fps: job.fps,
    width: job.width,
    height: job.height,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
    outputUrl: job.outputUrl,
    verification: job.verification,
  };
}
