import fs from "node:fs";
import path from "node:path";
import {
  AGENTMORPHY_SKIT_PROJECT,
  NEMOFY_TECH_COMMERCIAL_PROJECT,
} from "../src/utils/default-project";
import {
  getBlenderRenderJobStatus,
  startFullBlenderRenderJob,
} from "../src/blender/render-job-manager";
import { ensureLocalVoiceStudioService } from "../src/server/local-voicestudio-daemon";
import { synthesizeSceneSpeechWithOmniVoice } from "../src/server/voicestudio-adapter";
import { archiveAnimationToWorkspace } from "../src/server/animation-archive";

async function main() {
  const refDir = path.resolve("./public/renders/reference-encounter");
  fs.mkdirSync(refDir, { recursive: true });

  // Step 1: Archive the previous 18.8s Nemo & Leo 98% Usage Limit animation into /saved-animations/
  const existingMp4 = path.join(refDir, "nemo-and-leo-cinematic-encounter.mp4");
  const existingBlend = path.join(refDir, "encounter.blend");
  const existingSheet = path.join(refDir, "contact-sheet.jpg");
  const existingReport = path.join(refDir, "verification-report.json");

  if (fs.existsSync(existingMp4)) {
    let prevDuration = 18.8;
    let prevFrames = 564;
    if (fs.existsSync(existingReport)) {
      try {
        const rep = JSON.parse(fs.readFileSync(existingReport, "utf8"));
        prevDuration = rep.verification?.durationSeconds || 18.8;
        prevFrames = Math.round(prevDuration * 30);
      } catch {
        // ignore
      }
    }
    // Only archive as 01-nemo-and-leo-98-percent-usage-limit if it is the ~18.8s skit
    if (prevDuration < 25) {
      const archivedPrev = archiveAnimationToWorkspace({
        slugPrefix: "01-nemo-and-leo-98-percent-usage-limit",
        title: AGENTMORPHY_SKIT_PROJECT.name,
        description: AGENTMORPHY_SKIT_PROJECT.brief.topic,
        mp4SourcePath: existingMp4,
        blendSourcePath: fs.existsSync(existingBlend) ? existingBlend : null,
        contactSheetSourcePath: fs.existsSync(existingSheet) ? existingSheet : null,
        fps: 30,
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        totalFrames: prevFrames,
      });
      console.log(
        `[Archive] Saved previous animation to workspace folder: ${archivedPrev.folderPath}`,
      );
    }
  }

  // Step 2: Synthesize broadcast-clarity neural voiceovers for all 7 shots of NEMOFY_TECH_COMMERCIAL_PROJECT
  console.log("=== Step 2: Synthesizing Broadcast-Clarity Neural Voiceovers for Nemofy.tech (7 Shots) ===");
  await ensureLocalVoiceStudioService();

  const calibratedScenes = [];
  let totalSec = 0;

  for (const scene of NEMOFY_TECH_COMMERCIAL_PROJECT.scenes) {
    const voiceId = scene.dialogueVoiceId || "nemo";
    const speed = scene.dialogueSpeed || 1.06;
    const instruct =
      scene.dialogueInstruct ||
      (voiceId === "leo"
        ? "male, young adult, expressive urgent comedic tone"
        : "female, young adult, confident witty AI companion");

    const voRes = await synthesizeSceneSpeechWithOmniVoice({
      sceneId: scene.id,
      text: scene.narrationText,
      voiceId,
      language: "en",
      speed,
      instruct,
    });

    const srcWav = path.resolve(`./public${voRes.audioUrl}`);
    const canonicalRel = `/generated-audio/vo-${scene.id}.wav`;
    const dstWav = path.resolve(`./public${canonicalRel}`);
    if (fs.existsSync(srcWav) && srcWav !== dstWav) {
      fs.mkdirSync(path.dirname(dstWav), { recursive: true });
      fs.copyFileSync(srcWav, dstWav);
    }

    // Ensure at least 0.55s of natural breathing room after each spoken line so zero words are ever clipped
    const safeShotDur = Number(
      Math.max(scene.durationInSeconds, voRes.durationSeconds + 0.55).toFixed(1),
    );
    totalSec += safeShotDur;

    console.log(
      `  [${scene.id}] Speaker=${scene.dialogueSpeaker} (${voiceId}) | WAV=${voRes.durationSeconds.toFixed(2)}s -> Shot=${safeShotDur.toFixed(1)}s | "${scene.narrationText}"`,
    );

    calibratedScenes.push({
      ...scene,
      durationInSeconds: safeShotDur,
      dialogueAudioUrl: canonicalRel,
      dialogueAudioDurationSec: Number(voRes.durationSeconds.toFixed(2)),
    });
  }

  const totalFrames = Math.round(totalSec * 30);
  console.log(
    `=== Total Calibrated Commercial Duration: ${totalSec.toFixed(1)}s (${totalFrames} frames @ 30 FPS) ===`,
  );

  const calibratedProject = {
    ...NEMOFY_TECH_COMMERCIAL_PROJECT,
    brief: {
      ...NEMOFY_TECH_COMMERCIAL_PROJECT.brief,
      targetDurationSeconds: Number(totalSec.toFixed(1)),
    },
    scenes: calibratedScenes,
    audioTracks: NEMOFY_TECH_COMMERCIAL_PROJECT.audioTracks.map((t) => ({
      ...t,
      durationFrames: totalFrames,
    })),
  };

  // Step 3: Render full 3D commercial in Blender + FFmpeg
  console.log("=== Step 3: Starting Authoritative Blender Render: Nemofy.tech Official 3D Commercial ===");
  const initial = startFullBlenderRenderJob({
    project: calibratedProject,
    aspectRatio: "9:16",
    fps: 30,
    renderPreset: "draft",
    renderEngine: "EEVEE",
  });

  const jobId = initial.jobId;
  let lastLoggedFrames = -1;

  while (true) {
    await new Promise((r) => setTimeout(r, 1500));
    const state = getBlenderRenderJobStatus(jobId);
    if (!state) {
      throw new Error(`Job ${jobId} disappeared`);
    }

    if (state.framesCompleted !== lastLoggedFrames) {
      lastLoggedFrames = state.framesCompleted;
      console.log(
        `[${state.status}] ${state.progressPercent}% (${state.framesCompleted}/${state.totalFrames} frames)`,
      );
    }

    if (state.status === "completed") {
      const jobDir = path.resolve(`./public/renders/${jobId}`);
      const mp4Src = path.join(jobDir, `aetherframe-${jobId}.mp4`);
      const blendSrc = path.join(jobDir, "project.blend");
      const sheetSrc = path.join(jobDir, "contact-sheet.jpg");

      const mp4Dst = path.join(refDir, "nemo-and-leo-cinematic-encounter.mp4");
      const blendDst = path.join(refDir, "encounter.blend");
      const sheetDst = path.join(refDir, "contact-sheet.jpg");

      if (fs.existsSync(mp4Src)) fs.copyFileSync(mp4Src, mp4Dst);
      if (fs.existsSync(blendSrc)) fs.copyFileSync(blendSrc, blendDst);
      if (fs.existsSync(sheetSrc)) fs.copyFileSync(sheetSrc, sheetDst);

      for (const prev of state.previewImageUrls) {
        const srcFile = path.resolve(`./public${prev.url}`);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, path.join(refDir, path.basename(srcFile)));
        }
      }

      // Also save under canonical slug in /saved-animations/02-nemofy-tech-official-3d-commercial/
      const archivedNemofy = archiveAnimationToWorkspace({
        slugPrefix: "02-nemofy-tech-official-3d-commercial",
        title: calibratedProject.name,
        description: calibratedProject.brief.topic,
        mp4SourcePath: mp4Dst,
        blendSourcePath: fs.existsSync(blendDst) ? blendDst : null,
        contactSheetSourcePath: fs.existsSync(sheetDst) ? sheetDst : null,
        fps: state.fps,
        width: state.width,
        height: state.height,
        aspectRatio: state.aspectRatio,
        totalFrames: state.totalFrames,
        verification: state.verification,
      });

      const summaryPath = path.join(refDir, "verification-report.json");
      fs.writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            jobId,
            projectName: state.projectName,
            mp4Url: "/renders/reference-encounter/nemo-and-leo-cinematic-encounter.mp4",
            savedArchiveMp4Url: archivedNemofy.mp4Url,
            savedArchiveFolderPath: archivedNemofy.folderPath,
            blendUrl: "/renders/reference-encounter/encounter.blend",
            contactSheetUrl: "/renders/reference-encounter/contact-sheet.jpg",
            sceneInspection: state.sceneInspection,
            verification: state.verification,
            shotDurations: calibratedScenes.map((s) => ({
              id: s.id,
              speaker: s.dialogueSpeaker,
              audioSec: s.dialogueAudioDurationSec,
              shotSec: s.durationInSeconds,
            })),
          },
          null,
          2,
        ),
      );

      console.log("=== NEMOFY.TECH COMMERCIAL RENDER COMPLETED, ARCHIVED & VERIFIED ===");
      console.log("Saved to workspace folder:", archivedNemofy.folderPath);
      console.log(JSON.stringify(state.verification, null, 2));
      process.exit(0);
    }

    if (state.status === "failed" || state.status === "cancelled") {
      console.error("Render failed:", state.errorMessage);
      console.error(state.logs.join("\n"));
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
