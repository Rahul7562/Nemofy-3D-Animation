"""
AetherFrame 3D — Authoritative Blender Final Sequence Renderer
(scripts/blender/render_final.py)

Renders every frame of the approved .blend timeline (or a specified [start_frame, end_frame]
slice for multi-process parallel rendering) with shot-marker camera switching and
real-time stdout progress emission for the TypeScript render worker.
"""

import os
import shutil
import sys
import bpy


def render_full_sequence(frames_dir: str, start_frame: int = None, end_frame: int = None, quality_preset: str = "final"):
    scene = bpy.context.scene
    os.makedirs(frames_dir, exist_ok=True)

    f_start = int(start_frame) if start_frame is not None else scene.frame_start
    f_end = int(end_frame) if end_frame is not None else scene.frame_end
    total_frames = max(1, scene.frame_end - scene.frame_start + 1)

    is_software_gl = os.environ.get("LIBGL_ALWAYS_SOFTWARE") == "1"
    if is_software_gl:
        scene.render.resolution_percentage = 35 if quality_preset == "draft" else 50
    else:
        scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 92

    if hasattr(scene, "eevee"):
        if hasattr(scene.eevee, "taa_render_samples"):
            scene.eevee.taa_render_samples = 1 if is_software_gl else (2 if quality_preset == "draft" else 4)
        if is_software_gl:
            for flag in ("use_gtao", "use_ssr", "use_bloom", "use_volumetric_lights", "use_motion_blur"):
                if hasattr(scene.eevee, flag):
                    setattr(scene.eevee, flag, False)
            for obj in scene.objects:
                if obj.type == "CAMERA" and hasattr(obj.data, "dof"):
                    obj.data.dof.use_dof = False
                elif obj.type == "LIGHT" and obj.name != "Cinema_Key_Light":
                    if hasattr(obj.data, "use_shadow"):
                        obj.data.use_shadow = False
        if hasattr(scene.eevee, "shadow_cube_size"):
            scene.eevee.shadow_cube_size = "128" if is_software_gl else "512"
        if hasattr(scene.eevee, "shadow_cascade_size"):
            scene.eevee.shadow_cascade_size = "128" if is_software_gl else "512"

    markers_sorted = sorted(scene.timeline_markers, key=lambda m: m.frame)
    marker_cut_frames = {m.frame for m in markers_sorted}

    # In software-GL draft mode, step by 2 (or 3 for 600+ frame long-form videos) on non-cut frames so full sequences complete rapidly on CPU
    step_size = (3 if total_frames > 600 else 2) if (is_software_gl and quality_preset == "draft") else 1
    frame = f_start
    while frame <= f_end:
        scene.frame_set(frame)
        # Switch active camera at timeline shot markers
        for marker in markers_sorted:
            if marker.frame <= frame and marker.camera:
                scene.camera = marker.camera

        seq_index = frame - scene.frame_start + 1
        out_file = os.path.join(frames_dir, f"frame_{seq_index:05d}.jpg")
        scene.render.filepath = out_file
        bpy.ops.render.render(write_still=True)

        print(
            f"AETHERFRAME_PROGRESS frame={seq_index} total={total_frames} blender_frame={frame}",
            flush=True,
        )

        if step_size > 1:
            advanced = 1
            for offset in range(1, step_size):
                cand_frame = frame + offset
                if (
                    cand_frame <= f_end
                    and cand_frame not in marker_cut_frames
                    and cand_frame != f_end
                ):
                    cand_seq_index = cand_frame - scene.frame_start + 1
                    cand_out_file = os.path.join(frames_dir, f"frame_{cand_seq_index:05d}.jpg")
                    shutil.copyfile(out_file, cand_out_file)
                    print(
                        f"AETHERFRAME_PROGRESS frame={cand_seq_index} total={total_frames} blender_frame={cand_frame}",
                        flush=True,
                    )
                    advanced += 1
                else:
                    break
            frame += advanced
        else:
            frame += 1

    print("AETHERFRAME_RENDER_SEQUENCE_COMPLETE", flush=True)


if __name__ == "__main__":
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError("Usage: blender -b <project.blend> -P render_final.py -- <frames_dir> [start_frame] [end_frame] [preset]")
    args = argv[argv.index("--") + 1 :]
    out_frames_dir = args[0]
    f_s = int(args[1]) if len(args) >= 2 else None
    f_e = int(args[2]) if len(args) >= 3 else None
    preset = args[3] if len(args) >= 4 else "final"
    render_full_sequence(out_frames_dir, f_s, f_e, preset)
