"""
AetherFrame 3D — Blender Preview Frame Renderer
(scripts/blender/render_preview.py)

Renders representative preview keyframes (Opening, Character Close-Up, Interaction, Final)
directly from the authoritative .blend project so the studio UI displays real Blender renders.
"""

import os
import sys
import json
import bpy


def render_preview_frames(output_dir: str, preview_scale: float = 0.5):
    scene = bpy.context.scene
    os.makedirs(output_dir, exist_ok=True)

    orig_x = scene.render.resolution_x
    orig_y = scene.render.resolution_y
    scene.render.resolution_x = max(240, int(round(orig_x * preview_scale)) // 2 * 2)
    scene.render.resolution_y = max(240, int(round(orig_y * preview_scale)) // 2 * 2)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90

    total = max(1, scene.frame_end - scene.frame_start + 1)
    sample_frames = sorted(list({
        scene.frame_start,
        scene.frame_start + int(total * 0.38),
        scene.frame_start + int(total * 0.72),
        scene.frame_end,
    }))

    rendered_files = []
    for idx, f in enumerate(sample_frames):
        scene.frame_set(f)
        # Ensure active camera matches timeline markers
        for marker in sorted(scene.timeline_markers, key=lambda m: m.frame):
            if marker.frame <= f and marker.camera:
                scene.camera = marker.camera

        out_path = os.path.join(output_dir, f"preview_{idx + 1:02d}_f{f:04d}.jpg")
        scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        rendered_files.append({"frame": f, "path": out_path})
        print(f"AETHERFRAME_PREVIEW_FRAME frame={f} path={out_path}", flush=True)

    print("AETHERFRAME_PREVIEW_COMPLETE " + json.dumps(rendered_files), flush=True)


if __name__ == "__main__":
    argv = sys.argv
    args = argv[argv.index("--") + 1 :] if "--" in argv else []
    out_dir = args[0] if len(args) >= 1 else "/tmp/aetherframe-previews"
    scale = float(args[1]) if len(args) >= 2 else 0.5
    render_preview_frames(out_dir, scale)
