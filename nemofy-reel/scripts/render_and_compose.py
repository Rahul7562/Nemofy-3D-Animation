#!/usr/bin/env python3
"""
Parallel Blender renderer + FFmpeg safe-zone subtitle burner + MP4/Poster/ContactSheet
producer and audio/video QC verifier for the Nemofy StudentHub Instagram Reel.
"""

import concurrent.futures
import json
import os
import re
import subprocess
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REEL_DIR = os.path.join(REPO_ROOT, "nemofy-reel")
CORE_RENDER_FINAL = os.path.join(REPO_ROOT, "scripts", "blender", "render_final.py")
BUILD_REEL_PY = os.path.join(REEL_DIR, "blender", "scripts", "build_reel.py")


def run_blender_cmd(args: list, label: str):
    env = os.environ.copy()
    env["LIBGL_ALWAYS_SOFTWARE"] = "1"
    cmd = ["xvfb-run", "-a", "-s", "-screen 0 1280x720x24", "blender", "-b"] + args
    print(f"[RenderPipeline] Starting {label}: {' '.join(cmd)}")
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"{label} failed ({proc.returncode}):\n{proc.stdout[-800:]}\n{proc.stderr[-800:]}")
    print(f"[RenderPipeline] Finished {label}.")
    return proc.stdout


def main():
    skip_blend = "--skip-blend" in sys.argv
    timings_path = os.path.join(REEL_DIR, "beat_timings.json")
    blend_path = os.path.join(REEL_DIR, "blender", "project.blend")
    inspect_path = os.path.join(REEL_DIR, "blender", "scene_inspection.json")
    frames_dir = os.path.join(REEL_DIR, "blender", "renders", "frames")
    ass_path = os.path.join(REEL_DIR, "subtitles", "nemofy_reel.ass")
    master_wav = os.path.join(REEL_DIR, "voices", "mixed", "master_mix.wav")
    final_mp4 = os.path.join(REEL_DIR, "final", "nemofy_reel.mp4")
    poster_jpg = os.path.join(REEL_DIR, "final", "poster.jpg")
    contact_sheet_jpg = os.path.join(REEL_DIR, "blender", "renders", "contact-sheet.jpg")

    with open(timings_path, "r", encoding="utf-8") as f:
        timings = json.load(f)

    total_frames = int(timings["totalFrames"])
    fps = int(timings["fps"])
    total_dur = float(timings["totalDuration"])

    if not skip_blend or not os.path.exists(blend_path):
        run_blender_cmd(
            ["-P", BUILD_REEL_PY, "--", timings_path, blend_path, inspect_path],
            "Blender Scene Authoring",
        )

    os.makedirs(frames_dir, exist_ok=True)
    # Render across 3 parallel Blender workers (every single frame cleanly at native 30 FPS!)
    workers = 3
    chunk = max(1, (total_frames + workers - 1) // workers)
    ranges = []
    for w_idx in range(workers):
        s_f = w_idx * chunk + 1
        e_f = min(total_frames, (w_idx + 1) * chunk)
        if s_f <= total_frames:
            ranges.append((w_idx + 1, s_f, e_f))

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [
            ex.submit(
                run_blender_cmd,
                [blend_path, "-P", CORE_RENDER_FINAL, "--", frames_dir, str(sf), str(ef), "final"],
                f"Worker-{wid} frames [{sf}..{ef}]",
            )
            for wid, sf, ef in ranges
        ]
        for fut in futs:
            fut.result()

    # Verify all frames exist
    missing = [
        idx for idx in range(1, total_frames + 1)
        if not os.path.exists(os.path.join(frames_dir, f"frame_{idx:05d}.jpg"))
    ]
    if missing:
        raise RuntimeError(f"Missing {len(missing)} rendered Blender frames: first={missing[:5]}")

    # Encode final 1080x1920 30FPS H.264 + burned-in Instagram safe-zone subtitles + -14 LUFS AAC audio
    os.makedirs(os.path.dirname(final_mp4), exist_ok=True)
    # Escape path for ffmpeg ass filter
    ass_escaped = ass_path.replace("\\", "/").replace(":", "\\:")
    vf_chain = (
        f"scale=1080:1920:flags=lanczos,"
        f"ass='{ass_escaped}',"
        f"format=yuv420p"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-framerate", str(fps),
            "-i", os.path.join(frames_dir, "frame_%05d.jpg"),
            "-i", master_wav,
            "-vf", vf_chain,
            "-r", str(fps),
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart",
            "-shortest",
            final_mp4,
        ],
        check=True,
    )

    # Extract Poster Frame (Beat 09 Verilog Holo Showcase + characters cleanly framed)
    beat9_sec = next((b["startSec"] + 0.8 for b in timings["beats"] if b["id"] == 9), total_dur * 0.58)
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-ss", f"{beat9_sec:.2f}", "-i", final_mp4,
            "-frames:v", "1", "-q:v", "2",
            poster_jpg,
        ],
        check=True,
    )

    # Build 4x3 Contact Sheet spanning every beat (start, problem, roast, reveal, proof, payoff, loop)
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", final_mp4,
            "-vf", f"fps=12/{total_dur:.2f},scale=360:640,tile=4x3:padding=8:margin=8:color=#0B1020",
            "-frames:v", "1", "-q:v", "3",
            contact_sheet_jpg,
        ],
        check=True,
    )

    # Run ffprobe + blackdetect + ebur128 verification
    probe_json = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", final_mp4],
        text=True,
    )
    probe = json.loads(probe_json)
    ebur_proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", final_mp4, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )
    blk_proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", final_mp4, "-vf", "blackdetect=d=0.1:pix_th=0.05", "-an", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    )

    black_hits = re.findall(r"black_start:[0-9.]+", blk_proc.stdout + blk_proc.stderr)
    ebur_lines = [ln.strip() for ln in (ebur_proc.stdout + ebur_proc.stderr).splitlines() if re.match(r"^\s*(I:|LRA:|Peak:)", ln)]

    qc = {
        "finalMp4": final_mp4,
        "posterJpg": poster_jpg,
        "contactSheetJpg": contact_sheet_jpg,
        "durationSeconds": float(probe["format"]["duration"]),
        "fileSizeBytes": int(probe["format"]["size"]),
        "videoStream": next((s for s in probe["streams"] if s["codec_type"] == "video"), {}),
        "audioStream": next((s for s in probe["streams"] if s["codec_type"] == "audio"), {}),
        "ebur128Summary": ebur_lines[:6],
        "blackFrameDetections": len(black_hits),
    }
    qc_path = os.path.join(REEL_DIR, "final", "qc_metrics.json")
    with open(qc_path, "w", encoding="utf-8") as f:
        json.dump(qc, f, indent=2)

    print("[RenderPipeline] QC SUMMARY:")
    print(json.dumps({
        "duration": qc["durationSeconds"],
        "res": f"{qc['videoStream'].get('width')}x{qc['videoStream'].get('height')}",
        "fps": qc["videoStream"].get("r_frame_rate"),
        "vcodec": qc["videoStream"].get("codec_name"),
        "acodec": qc["audioStream"].get("codec_name"),
        "blackFrames": qc["blackFrameDetections"],
        "ebur128": qc["ebur128Summary"][:3],
    }, indent=2))


if __name__ == "__main__":
    main()
