import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import { inspectSystemHardware } from "../server/voicestudio-adapter";
import {
  getProductionAssetCatalogue,
  ProductionAssetCatalogEntry,
} from "./asset-manager";

const execFileAsync = promisify(execFile);

export interface BlenderDiagnosticsReport {
  available: boolean;
  executablePath: string;
  version: string | null;
  versionString: string | null;
  pythonVersion: string | null;
  xvfbAvailable: boolean;
  rigifyEnabled: boolean;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  supportedEngines: ("BLENDER_EEVEE" | "CYCLES" | "BLENDER_WORKBENCH")[];
  recommendedEngine: "BLENDER_EEVEE" | "CYCLES";
  remoteWorkerUrl: string | null;
  workerMode: "local-headless-blender" | "remote-worker" | "unavailable";
  errorMessage: string | null;
  hardware: Awaited<ReturnType<typeof inspectSystemHardware>>;
  assetCatalogue: ProductionAssetCatalogEntry[];
  windowsInstallCommands: string[];
  linuxInstallCommands: string[];
  installInstructions: {
    windowsWinget: string;
    ubuntuDebianApt: string;
    envConfig: string;
  };
  checkedAt: string;
}

let cachedDiagnostics: {
  report: BlenderDiagnosticsReport;
  timestamp: number;
} | null = null;

export async function getBlenderDiagnostics(
  forceRefresh = false,
): Promise<BlenderDiagnosticsReport> {
  if (
    !forceRefresh &&
    cachedDiagnostics &&
    Date.now() - cachedDiagnostics.timestamp < 15000
  ) {
    return cachedDiagnostics.report;
  }

  const configuredExec = process.env.BLENDER_EXECUTABLE || "blender";
  const remoteWorkerUrl = process.env.BLENDER_REMOTE_WORKER_URL || null;
  const hardware = await inspectSystemHardware();
  const assetCatalogue = getProductionAssetCatalogue();

  let available = false;
  let resolvedPath = configuredExec;
  let versionString: string | null = null;
  let version: string | null = null;
  let xvfbAvailable = false;
  let ffmpegAvailable = false;
  let ffprobeAvailable = false;

  try {
    const { stdout: whichOut } = await execFileAsync("which", ["xvfb-run"], {
      timeout: 3000,
    });
    xvfbAvailable = whichOut.trim().length > 0;
  } catch {
    xvfbAvailable = false;
  }

  try {
    const { stdout: ffOut } = await execFileAsync("which", ["ffmpeg"], {
      timeout: 3000,
    });
    ffmpegAvailable = ffOut.trim().length > 0;
  } catch {
    ffmpegAvailable = false;
  }

  try {
    const { stdout: fpOut } = await execFileAsync("which", ["ffprobe"], {
      timeout: 3000,
    });
    ffprobeAvailable = fpOut.trim().length > 0;
  } catch {
    ffprobeAvailable = false;
  }

  try {
    const { stdout } = await execFileAsync(configuredExec, ["--version"], {
      timeout: 6000,
    });
    const firstLine = stdout.split("\n")[0]?.trim() || "";
    if (firstLine.toLowerCase().includes("blender")) {
      available = true;
      versionString = firstLine;
      const m = firstLine.match(/Blender\s+([0-9.]+)/i);
      version = m ? m[1] : firstLine;
      try {
        const { stdout: wOut } = await execFileAsync("which", [configuredExec], {
          timeout: 3000,
        });
        if (wOut.trim()) resolvedPath = wOut.trim();
      } catch {
        // Keep configuredExec
      }
    }
  } catch {
    const fallbackPaths = [
      "/usr/bin/blender",
      "/usr/local/bin/blender",
      "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
      "C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe",
      "C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe",
    ];
    for (const candidate of fallbackPaths) {
      if (fs.existsSync(candidate)) {
        try {
          const { stdout } = await execFileAsync(candidate, ["--version"], {
            timeout: 6000,
          });
          const firstLine = stdout.split("\n")[0]?.trim() || "";
          if (firstLine.toLowerCase().includes("blender")) {
            available = true;
            resolvedPath = candidate;
            versionString = firstLine;
            const m = firstLine.match(/Blender\s+([0-9.]+)/i);
            version = m ? m[1] : firstLine;
            break;
          }
        } catch {
          // continue
        }
      }
    }
  }

  const workerMode: BlenderDiagnosticsReport["workerMode"] = available
    ? "local-headless-blender"
    : remoteWorkerUrl
      ? "remote-worker"
      : "unavailable";

  const report: BlenderDiagnosticsReport = {
    available,
    executablePath: resolvedPath,
    version,
    versionString,
    pythonVersion: "3.11",
    xvfbAvailable,
    rigifyEnabled: available,
    ffmpegAvailable,
    ffprobeAvailable,
    supportedEngines: ["BLENDER_EEVEE", "CYCLES", "BLENDER_WORKBENCH"],
    recommendedEngine: "BLENDER_EEVEE",
    remoteWorkerUrl,
    workerMode,
    errorMessage: available
      ? null
      : `Blender executable (${configuredExec}) not found on PATH.`,
    hardware,
    assetCatalogue,
    windowsInstallCommands: [
      "winget install -e --id BlenderFoundation.Blender",
      "winget install -e --id Gyan.FFmpeg",
    ],
    linuxInstallCommands: [
      "sudo apt-get update && sudo apt-get install -y blender xvfb libgl1-mesa-dri ffmpeg",
    ],
    installInstructions: {
      windowsWinget: "winget install -e --id BlenderFoundation.Blender",
      ubuntuDebianApt:
        "sudo apt-get update && sudo apt-get install -y blender xvfb libgl1-mesa-dri ffmpeg",
      envConfig: "BLENDER_EXECUTABLE=/usr/bin/blender",
    },
    checkedAt: new Date().toISOString(),
  };

  cachedDiagnostics = { report, timestamp: Date.now() };
  return report;
}
