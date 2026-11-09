import fs from "node:fs";
import path from "node:path";
import { MediaVerificationReport, StudioProject } from "../utils/types";

export const SAVED_ANIMATIONS_ROOT = path.resolve("./saved-animations");
export const SAVED_ANIMATIONS_INDEX_PATH = path.join(
  SAVED_ANIMATIONS_ROOT,
  "index.json",
);

export interface SavedAnimationEntry {
  id: string;
  slug: string;
  title: string;
  description: string;
  folderPath: string;
  mp4Url: string;
  blendUrl: string | null;
  contactSheetUrl: string | null;
  projectJsonUrl: string;
  durationSeconds: number;
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  aspectRatio: string;
  createdAt: string;
  verification: MediaVerificationReport | null;
}

export function ensureSavedAnimationsDirectory(): void {
  fs.mkdirSync(SAVED_ANIMATIONS_ROOT, { recursive: true });
}

export function slugifyAnimationName(rawName: string): string {
  return (
    rawName
      .toLowerCase()
      .replace(/https?:\/\//g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "animation"
  );
}

export function listSavedAnimations(): SavedAnimationEntry[] {
  ensureSavedAnimationsDirectory();
  if (!fs.existsSync(SAVED_ANIMATIONS_INDEX_PATH)) {
    return [];
  }
  try {
    const raw = JSON.parse(
      fs.readFileSync(SAVED_ANIMATIONS_INDEX_PATH, "utf8"),
    );
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function archiveAnimationToWorkspace(params: {
  slugPrefix?: string;
  title: string;
  description: string;
  mp4SourcePath: string;
  blendSourcePath?: string | null;
  contactSheetSourcePath?: string | null;
  project?: StudioProject | null;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  aspectRatio?: string;
  verification?: MediaVerificationReport | null;
}): SavedAnimationEntry {
  ensureSavedAnimationsDirectory();

  const baseSlug = params.slugPrefix
    ? slugifyAnimationName(params.slugPrefix)
    : `${new Date().toISOString().slice(0, 10)}-${slugifyAnimationName(params.title)}`;

  const targetDir = path.join(SAVED_ANIMATIONS_ROOT, baseSlug);
  fs.mkdirSync(targetDir, { recursive: true });

  const mp4FileName = `${baseSlug}.mp4`;
  const mp4DestPath = path.join(targetDir, mp4FileName);
  if (fs.existsSync(params.mp4SourcePath)) {
    fs.copyFileSync(params.mp4SourcePath, mp4DestPath);
  }

  let blendUrl: string | null = null;
  if (params.blendSourcePath && fs.existsSync(params.blendSourcePath)) {
    const blendFileName = `${baseSlug}.blend`;
    fs.copyFileSync(
      params.blendSourcePath,
      path.join(targetDir, blendFileName),
    );
    blendUrl = `/saved-animations/${baseSlug}/${blendFileName}`;
  }

  let contactSheetUrl: string | null = null;
  if (
    params.contactSheetSourcePath &&
    fs.existsSync(params.contactSheetSourcePath)
  ) {
    const sheetFileName = "contact-sheet.jpg";
    fs.copyFileSync(
      params.contactSheetSourcePath,
      path.join(targetDir, sheetFileName),
    );
    contactSheetUrl = `/saved-animations/${baseSlug}/${sheetFileName}`;
  }

  const durationSeconds =
    params.verification?.durationSeconds ||
    Number((params.totalFrames / Math.max(1, params.fps)).toFixed(2));

  const entry: SavedAnimationEntry = {
    id: baseSlug,
    slug: baseSlug,
    title: params.title,
    description: params.description,
    folderPath: `saved-animations/${baseSlug}`,
    mp4Url: `/saved-animations/${baseSlug}/${mp4FileName}`,
    blendUrl,
    contactSheetUrl,
    projectJsonUrl: `/saved-animations/${baseSlug}/project.json`,
    durationSeconds,
    totalFrames: params.totalFrames,
    fps: params.fps,
    width: params.width,
    height: params.height,
    aspectRatio:
      params.aspectRatio ||
      (params.height > params.width ? "9:16" : "16:9"),
    createdAt: new Date().toISOString(),
    verification: params.verification || null,
  };

  fs.writeFileSync(
    path.join(targetDir, "project.json"),
    JSON.stringify(
      {
        archiveMetadata: entry,
        project: params.project || null,
      },
      null,
      2,
    ),
  );

  const existing = listSavedAnimations().filter((item) => item.id !== entry.id);
  const updated = [entry, ...existing];
  fs.writeFileSync(
    SAVED_ANIMATIONS_INDEX_PATH,
    JSON.stringify(updated, null, 2),
  );

  return entry;
}
