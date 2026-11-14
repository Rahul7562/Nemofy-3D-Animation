import fs from "node:fs";
import path from "node:path";
import {
  NEMO_LEO_PLAYFUL_ROAST_PROJECT,
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
  const previewsDir = path.join(refDir, "previews");
  fs.mkdirSync(previewsDir, { recursive: true });

  console.log(
    "=== Step 1: Synthesizing Expressive Neural Voiceovers for Nemo & Leo Playful Roast (5 Shots) ===",
  );
  await ensureLocalVoiceStudioService();

  const calibratedScenes = [];
  let totalSec = 0;

  for (const scene of NEMO_LEO_PLAYFUL_ROAST_PROJECT.scenes) {
    const voiceId = scene.dialogueVoiceId || "nemo";
    const speed = scene.dialogueSpeed || 1.05;
    const instruct =
      scene.dialogueInstruct ||
      (voiceId === "leo"
        ? "male, young adult, expressive playful roast critique"
        : "female, young adult, energetic witty playful banter");

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
    `=== Total Calibrated Playful Roast Duration: ${totalSec.toFixed(1)}s (${totalFrames} frames @ 30 FPS) ===`,
  );

  const calibratedProject = {
    ...NEMO_LEO_PLAYFUL_ROAST_PROJECT,
    brief: {
      ...NEMO_LEO_PLAYFUL_ROAST_PROJECT.brief,
      targetDurationSeconds: Number(totalSec.toFixed(1)),
    },
    scenes: calibratedScenes,
    audioTracks: NEMO_LEO_PLAYFUL_ROAST_PROJECT.audioTracks.map((t) => ({
      ...t,
      durationFrames: totalFrames,
    })),
  };

  console.log(
    "=== Step 2: Starting Authoritative Stutter-Free Blender Render: Nemo & Leo Playful Code Roast ===",
  );
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

      const copiedPreviewUrls: Array<{ frame: number; url: string }> = [];
      for (const prev of state.previewImageUrls) {
        const srcFile = path.resolve(`./public${prev.url}`);
        if (fs.existsSync(srcFile)) {
          const baseName = path.basename(srcFile);
          fs.copyFileSync(srcFile, path.join(refDir, baseName));
          fs.copyFileSync(srcFile, path.join(previewsDir, baseName));
          copiedPreviewUrls.push({
            frame: prev.frame,
            url: `/renders/reference-encounter/previews/${baseName}`,
          });
        }
      }

      // Save under canonical slug in /saved-animations/03-nemo-and-leo-playful-code-roast/
      const archivedRoast = archiveAnimationToWorkspace({
        slugPrefix: "03-nemo-and-leo-playful-code-roast",
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
            savedArchiveMp4Url: archivedRoast.mp4Url,
            savedArchiveFolderPath: archivedRoast.folderPath,
            blendUrl: "/renders/reference-encounter/encounter.blend",
            contactSheetUrl: "/renders/reference-encounter/contact-sheet.jpg",
            previewImageUrls: copiedPreviewUrls,
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

      console.log("=== NEMO & LEO PLAYFUL CODE ROAST RENDER COMPLETED, ARCHIVED & VERIFIED ===");
      console.log("Saved to workspace folder:", archivedRoast.folderPath);
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
