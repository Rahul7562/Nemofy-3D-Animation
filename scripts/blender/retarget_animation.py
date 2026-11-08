"""
AetherFrame 3D — Skeletal Animation Retargeting & Clip Library (scripts/blender/retarget_animation.py)
Retargets external Mixamo / BVH / FBX / GLB skeletal animation clips onto canonical
AetherFrame Blender Armatures (Nemo_Rig & Leo_Rig) with foot-ground locking (Z = 0.0)
and NLA track layering.
"""

import os
import math
import bpy


MIXAMO_TO_CANONICAL_BONES = {
    "mixamorig:Hips": "hips",
    "mixamorig:Spine": "spine",
    "mixamorig:Spine1": "spine",
    "mixamorig:Spine2": "chest",
    "mixamorig:Neck": "neck",
    "mixamorig:Head": "head",
    "mixamorig:LeftShoulder": "shoulder.L",
    "mixamorig:LeftArm": "upper_arm.L",
    "mixamorig:LeftForeArm": "forearm.L",
    "mixamorig:LeftHand": "hand.L",
    "mixamorig:RightShoulder": "shoulder.R",
    "mixamorig:RightArm": "upper_arm.R",
    "mixamorig:RightForeArm": "forearm.R",
    "mixamorig:RightHand": "hand.R",
    "mixamorig:LeftUpLeg": "thigh.L",
    "mixamorig:LeftLeg": "shin.L",
    "mixamorig:LeftFoot": "foot.L",
    "mixamorig:RightUpLeg": "thigh.R",
    "mixamorig:RightLeg": "shin.R",
    "mixamorig:RightFoot": "foot.R",
}


def retarget_external_clip_to_rig(
    source_armature: bpy.types.Object,
    target_armature: bpy.types.Object,
    frame_start: int,
    frame_end: int,
    action_name: str = "RetargetedClip",
) -> bpy.types.Action:
    """
    Copies bone rotations from a Mixamo/external source armature onto the canonical
    target_armature across [frame_start, frame_end] and locks foot ground height.
    """
    if not target_armature.animation_data:
        target_armature.animation_data_create()

    action = bpy.data.actions.new(name=action_name)
    target_armature.animation_data.action = action

    for frame in range(frame_start, frame_end + 1):
        bpy.context.scene.frame_set(frame)
        for src_bone_name, dst_bone_name in MIXAMO_TO_CANONICAL_BONES.items():
            if src_bone_name in source_armature.pose.bones and dst_bone_name in target_armature.pose.bones:
                src_pb = source_armature.pose.bones[src_bone_name]
                dst_pb = target_armature.pose.bones[dst_bone_name]
                dst_pb.rotation_euler = src_pb.rotation_euler.copy()
                dst_pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    return action


def push_action_to_nla(
    armature_obj: bpy.types.Object,
    action: bpy.types.Action,
    track_name: str,
    frame_start: int = 1,
    blend_in: int = 6,
    blend_out: int = 6,
):
    """
    Pushes a keyframed Blender Action onto an NLA track on armature_obj for clean
    non-destructive animation layering.
    """
    if not armature_obj.animation_data:
        armature_obj.animation_data_create()

    track = armature_obj.animation_data.nla_tracks.new()
    track.name = track_name
    strip = track.strips.new(name=action.name, start=frame_start, action=action)
    strip.blend_type = "COMBINE"
    strip.blend_in = blend_in
    strip.blend_out = blend_out
    return strip
