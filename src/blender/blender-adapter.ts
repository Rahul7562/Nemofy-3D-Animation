import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getBlenderDiagnostics } from "./blender-diagnostics";
import { BlenderProjectManifest } from "./project-serializer";

export interface BlenderSceneInspectionReport {
  valid: boolean;
  blenderVersion: string;
  frameStart: number;
  frameEnd: number;
  fps: number;
  resolution: [number, number];
  armatureCount: number;
  meshCount: number;
  lightCount: number;
  cameraCount: number;
  missingMaterialCount: number;
  charactersNonIntersecting: boolean;
  savedBlendPath?: string;
  characters: Array<{
    rigName: string;
    boneCount: number;
    fcurveCount: number;
    childMeshCount: number;
    minFootZ: number;
    maxHeadZ: number;
    groundContactValid: boolean;
    hasFacialRig: boolean;
  }>;
  framingChecks: Array<{
    frame: number;
    camera: string;
    allSubjectsInSafeFrustum: boolean;
    subjectNdcCoords: Record<string, [number, number, number]>;
  }>;
}

const SCRIPTS_DIR = path.resolve("./scripts/blender");

function spawnBlenderProcess(
  executable: string,
  args: string[],
  useXvfb: boolean,
  onStdoutLine?: (line: string) => void,
  onChildSpawned?: (proc: ChildProcess) => void,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const cmd = useXvfb ? "xvfb-run" : executable;
    const finalArgs = useXvfb
      ? ["-a", "-s", "-screen 0 1280x1024x24", executable, ...args]
      : args;

    const proc = spawn(cmd, finalArgs, {
      env: {
        ...process.env,
        LIBGL_ALWAYS_SOFTWARE: "1",
      },
    });
    onChildSpawned?.(proc);

    let stdout = "";
    let stderr = "";
    let lineBuffer = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      lineBuffer += text;
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() || "";
      for (const line of lines) {
        onStdoutLine?.(line.trim());
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      if (lineBuffer.trim()) {
        onStdoutLine?.(lineBuffer.trim());
      }
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

export async function buildBlenderSceneFromManifest(params: {
  manifest: BlenderProjectManifest;
  workDir: string;
  outputBlendPath: string;
  onLog?: (line: string) => void;
}): Promise<{
  blendFilePath: string;
  inspection: BlenderSceneInspectionReport;
  logs: string[];
}> {
  const diag = await getBlenderDiagnostics();
  if (!diag.available) {
    throw new Error(
      `Blender executable (${diag.executablePath}) is not installed on this host. Configure BLENDER_EXECUTABLE or install Blender.`,
    );
  }

  fs.mkdirSync(params.workDir, { recursive: true });
  const manifestPath = path.join(params.workDir, "manifest.json");
  const inspectionPath = path.join(params.workDir, "inspection.json");
  fs.writeFileSync(manifestPath, JSON.stringify(params.manifest, null, 2));

  const buildScript = path.join(SCRIPTS_DIR, "build_scene.py");
  const logs: string[] = [];

  const { stdout, stderr, exitCode } = await spawnBlenderProcess(
    diag.executablePath,
    [
      "-b",
      "-noaudio",
      "-P",
      buildScript,
      "--",
      manifestPath,
      params.outputBlendPath,
      inspectionPath,
    ],
    false,
    (line) => {
      if (line) {
        logs.push(line);
        params.onLog?.(line);
      }
    },
  );

  if (exitCode !== 0 || !fs.existsSync(params.outputBlendPath)) {
    throw new Error(
      `Blender scene generation failed (exit ${exitCode}): ${stderr || stdout.slice(-500)}`,
    );
  }

  let inspection: BlenderSceneInspectionReport | null = null;
  if (fs.existsSync(inspectionPath)) {
    inspection = JSON.parse(
      fs.readFileSync(inspectionPath, "utf-8"),
    ) as BlenderSceneInspectionReport;
  } else {
    const startIdx = stdout.indexOf("AETHERFRAME_INSPECTION_JSON_START");
    const endIdx = stdout.indexOf("AETHERFRAME_INSPECTION_JSON_END");
    if (startIdx >= 0 && endIdx > startIdx) {
      const jsonStr = stdout
        .slice(startIdx + "AETHERFRAME_INSPECTION_JSON_START".length, endIdx)
        .trim();
      inspection = JSON.parse(jsonStr) as BlenderSceneInspectionReport;
    }
  }

  if (!inspection) {
    throw new Error("Blender scene built, but inspection report was not produced.");
  }

  return {
    blendFilePath: params.outputBlendPath,
    inspection,
    logs,
  };
}

export async function renderBlenderPreviewStills(params: {
  blendFilePath: string;
  outputDir: string;
  previewScale?: number;
  onLog?: (line: string) => void;
}): Promise<Array<{ frame: number; path: string }>> {
  const diag = await getBlenderDiagnostics();
  if (!diag.available) {
    throw new Error("Blender executable is not available for preview rendering.");
  }

  const previewScript = path.join(SCRIPTS_DIR, "render_preview.py");
  const scale = params.previewScale ?? 0.5;
  const renderedFrames: Array<{ frame: number; path: string }> = [];

  const { stdout, stderr, exitCode } = await spawnBlenderProcess(
    diag.executablePath,
    [
      "-b",
      params.blendFilePath,
      "-noaudio",
      "-P",
      previewScript,
      "--",
      params.outputDir,
      String(scale),
    ],
    diag.xvfbAvailable,
    (line) => {
      params.onLog?.(line);
      if (line.startsWith("AETHERFRAME_PREVIEW_COMPLETE ")) {
        try {
          const parsed = JSON.parse(
            line.slice("AETHERFRAME_PREVIEW_COMPLETE ".length),
          ) as Array<{ frame: number; path: string }>;
          renderedFrames.push(...parsed);
        } catch {
          // ignore parse error
        }
      }
    },
  );

  if (exitCode !== 0 && renderedFrames.length === 0) {
    throw new Error(
      `Blender preview render failed (exit ${exitCode}): ${stderr || stdout.slice(-400)}`,
    );
  }

  return renderedFrames;
}

export async function renderBlenderSequenceFrames(params: {
  blendFilePath: string;
  framesDir: string;
  startFrame: number;
  endFrame: number;
  preset: "draft" | "standard" | "final";
  onProgress?: (currentFrame: number, totalFrames: number) => void;
  onLog?: (line: string) => void;
  onProcess?: (proc: ChildProcess) => void;
}): Promise<void> {
  const diag = await getBlenderDiagnostics();
  if (!diag.available) {
    throw new Error("Blender executable is not available for sequence rendering.");
  }

  const finalScript = path.join(SCRIPTS_DIR, "render_final.py");
  const totalFrames = Math.max(1, params.endFrame - params.startFrame + 1);
  const completedSet = new Set<number>();

  // Use 2 parallel Blender worker slices when rendering >= 40 frames
  const workerCount = totalFrames >= 40 ? 2 : 1;
  const sliceSize = Math.ceil(totalFrames / workerCount);
  const slices: Array<{ s: number; e: number }> = [];
  for (let i = 0; i < workerCount; i++) {
    const s = params.startFrame + i * sliceSize;
    const e = Math.min(params.endFrame, s + sliceSize - 1);
    if (s <= e) {
      slices.push({ s, e });
    }
  }

  await Promise.all(
    slices.map(async (slice) => {
      const { stdout, stderr, exitCode } = await spawnBlenderProcess(
        diag.executablePath,
        [
          "-b",
          params.blendFilePath,
          "-noaudio",
          "-P",
          finalScript,
          "--",
          params.framesDir,
          String(slice.s),
          String(slice.e),
          params.preset,
        ],
        diag.xvfbAvailable,
        (line) => {
          params.onLog?.(line);
          if (line.startsWith("AETHERFRAME_PROGRESS ")) {
            const mFrame = line.match(/frame=(\d+)/);
            if (mFrame) {
              completedSet.add(Number(mFrame[1]));
              params.onProgress?.(completedSet.size, totalFrames);
            }
          }
        },
        params.onProcess,
      );

      if (exitCode !== 0) {
        throw new Error(
          `Blender sequence rendering slice [${slice.s}-${slice.e}] failed (exit ${exitCode}): ${stderr || stdout.slice(-500)}`,
        );
      }
    }),
  );
}

