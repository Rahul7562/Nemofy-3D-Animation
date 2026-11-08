import fs from "node:fs";
import path from "node:path";
import { VERTICAL_SHOWCASE_PROJECT } from "../src/utils/default-project";
import {
  getBlenderRenderJobStatus,
  startFullBlenderRenderJob,
} from "../src/blender/render-job-manager";

async function main() {
  console.log("=== Starting Authoritative Blender Render: Nemo and Leo — A Cinematic Encounter ===");
  const initial = startFullBlenderRenderJob({
    project: VERTICAL_SHOWCASE_PROJECT,
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
      const refDir = path.resolve("./public/renders/reference-encounter");
      fs.mkdirSync(refDir, { recursive: true });

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

      const summaryPath = path.join(refDir, "verification-report.json");
      fs.writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            jobId,
            projectName: state.projectName,
            mp4Url: "/renders/reference-encounter/nemo-and-leo-cinematic-encounter.mp4",
            blendUrl: "/renders/reference-encounter/encounter.blend",
            contactSheetUrl: "/renders/reference-encounter/contact-sheet.jpg",
            sceneInspection: state.sceneInspection,
            verification: state.verification,
          },
          null,
          2,
        ),
      );

      console.log("=== REFERENCE RENDER COMPLETED & VERIFIED ===");
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
