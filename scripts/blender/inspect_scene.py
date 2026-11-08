"""
AetherFrame 3D — Automated Blender Scene & Render Quality Inspector
(scripts/blender/inspect_scene.py)

Inspects an authored Blender scene (.blend) and outputs a structured JSON report
validating character armatures, bone counts, animation F-curves, foot ground contact,
non-intersection, camera frustum framing at key frames, lights, and materials.
"""

import sys
import json
import bpy
import mathutils
from bpy_extras.object_utils import world_to_camera_view


def inspect_current_blender_scene() -> dict:
    scene = bpy.context.scene
    armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    lights = [obj for obj in scene.objects if obj.type == "LIGHT"]
    cameras = [obj for obj in scene.objects if obj.type == "CAMERA"]

    character_reports = []
    for arm in armatures:
        bone_names = [b.name for b in arm.data.bones]
        fcurve_count = 0
        if arm.animation_data and arm.animation_data.action:
            fcurve_count = len(arm.animation_data.action.fcurves)

        # Evaluate bounding-box minimum Z across child meshes at start frame
        scene.frame_set(scene.frame_start)
        min_z = 999.0
        max_z = -999.0
        child_meshes = [m for m in meshes if m.parent == arm]
        for m in child_meshes:
            for corner in m.bound_box:
                world_pt = m.matrix_world @ mathutils.Vector(corner)
                min_z = min(min_z, world_pt.z)
                max_z = max(max_z, world_pt.z)

        ground_contact_ok = -0.06 <= min_z <= 0.08
        character_reports.append({
            "rigName": arm.name,
            "boneCount": len(bone_names),
            "fcurveCount": fcurve_count,
            "childMeshCount": len(child_meshes),
            "minFootZ": round(min_z, 4),
            "maxHeadZ": round(max_z, 4),
            "groundContactValid": ground_contact_ok,
            "hasFacialRig": all(b in bone_names for b in ("jaw", "lip_upper", "lip_lower", "brow.L", "eyelid_upper.L")),
        })

    # Check camera framing of characters at start, midpoint, and end frames
    sample_frames = [
        scene.frame_start,
        (scene.frame_start + scene.frame_end) // 2,
        scene.frame_end,
    ]
    framing_checks = []
    for f in sample_frames:
        scene.frame_set(f)
        # Resolve active camera at frame f via timeline markers
        active_cam = scene.camera
        for marker in sorted(scene.timeline_markers, key=lambda m: m.frame):
            if marker.frame <= f and marker.camera:
                active_cam = marker.camera

        if active_cam:
            in_frustum_all = True
            coords_by_rig = {}
            for arm in armatures:
                head_world = arm.matrix_world @ mathutils.Vector((0.0, 0.0, 1.50))
                ndc = world_to_camera_view(scene, active_cam, head_world)
                in_view = (0.04 <= ndc.x <= 0.96) and (0.10 <= ndc.y <= 0.94) and (ndc.z > 0.3)
                coords_by_rig[arm.name] = [round(ndc.x, 3), round(ndc.y, 3), round(ndc.z, 3)]
                if not in_view:
                    in_frustum_all = False

            framing_checks.append({
                "frame": f,
                "camera": active_cam.name,
                "allSubjectsInSafeFrustum": in_frustum_all,
                "subjectNdcCoords": coords_by_rig,
            })

    # Check non-intersection between character roots
    non_intersecting = True
    if len(armatures) >= 2:
        dist = (armatures[0].location - armatures[1].location).length
        non_intersecting = dist >= 0.65

    missing_materials = sum(1 for m in meshes if len(m.data.materials) == 0)

    valid = (
        len(armatures) >= 2
        and all(c["boneCount"] >= 20 and c["fcurveCount"] >= 10 and c["groundContactValid"] for c in character_reports)
        and len(lights) >= 3
        and len(cameras) >= 1
        and non_intersecting
        and missing_materials == 0
    )

    return {
        "valid": valid,
        "blenderVersion": bpy.app.version_string,
        "frameStart": scene.frame_start,
        "frameEnd": scene.frame_end,
        "fps": scene.render.fps,
        "resolution": [scene.render.resolution_x, scene.render.resolution_y],
        "armatureCount": len(armatures),
        "meshCount": len(meshes),
        "lightCount": len(lights),
        "cameraCount": len(cameras),
        "missingMaterialCount": missing_materials,
        "charactersNonIntersecting": non_intersecting,
        "characters": character_reports,
        "framingChecks": framing_checks,
    }


if __name__ == "__main__":
    argv = sys.argv
    out_json_path = None
    if "--" in argv:
        args = argv[argv.index("--") + 1 :]
        if len(args) >= 1:
            out_json_path = args[0]

    report = inspect_current_blender_scene()
    print("AETHERFRAME_INSPECTION_JSON_START")
    print(json.dumps(report))
    print("AETHERFRAME_INSPECTION_JSON_END")
    if out_json_path:
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
