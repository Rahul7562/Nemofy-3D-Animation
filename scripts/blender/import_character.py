"""
AetherFrame 3D — Production Character Builder & Importer (scripts/blender/import_character.py)
Imports external rigged character assets (GLB/FBX/BLEND) when available in assets/characters/,
or constructs articulated Blender Armature rigs for:
  - Leo (Left): @agentmorphy-style blocky chibi developer with wide peach head, 5 chunky
    dark-indigo pyramidal hair spikes, vertical dark pixel eyes, clean articulated talking mouth,
    cobalt-blue hoodie with 2 crisp vertical white chest stripes, and white blocky sneakers.
  - Nemo (Right): @agentmorphy-style cute wide coral-terracotta 3D cube AI agent companion
    (#E06D53 with warm golden right bevel #F18F70), vertical dark pixel eyes, clean articulated
    viseme mouth cavity with tongue, stubby waving side-arms, and 4 stubby blocky legs.
"""

import os
import math
import bpy
import mathutils


REQUIRED_BONES = [
    "root",
    "hips",
    "spine",
    "chest",
    "neck",
    "head",
    "jaw",
    "lip_upper",
    "lip_lower",
    "mouth_corner.L",
    "mouth_corner.R",
    "eye.L",
    "eye.R",
    "eyelid_upper.L",
    "eyelid_upper.R",
    "brow.L",
    "brow.R",
    "shoulder.L",
    "upper_arm.L",
    "forearm.L",
    "hand.L",
    "shoulder.R",
    "upper_arm.R",
    "forearm.R",
    "hand.R",
    "thigh.L",
    "shin.L",
    "foot.L",
    "thigh.R",
    "shin.R",
    "foot.R",
]


def hex_to_rgba(hex_str: str, alpha: float = 1.0):
    h = hex_str.lstrip("#")
    if len(h) != 6:
        return (0.8, 0.8, 0.8, alpha)
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return (pow(r, 2.2), pow(g, 2.2), pow(b, 2.2), alpha)


def set_principled_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return


def create_pbr_material(
    name: str,
    base_hex: str,
    roughness: float = 0.45,
    metallic: float = 0.0,
    subsurface: float = 0.0,
    emission_hex: str = None,
    emission_strength: float = 0.0,
    bump_scale: float = 0.0,
    noise_scale: float = 25.0,
):
    if name in bpy.data.materials:
        return bpy.data.materials[name]

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out_node = nodes.new(type="ShaderNodeOutputMaterial")
    out_node.location = (400, 0)

    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)

    rgba = hex_to_rgba(base_hex)
    set_principled_input(bsdf, ["Base Color"], rgba)
    set_principled_input(bsdf, ["Roughness"], roughness)
    set_principled_input(bsdf, ["Metallic"], metallic)

    if subsurface > 0.0:
        set_principled_input(bsdf, ["Subsurface Weight", "Subsurface"], subsurface)
        set_principled_input(bsdf, ["Subsurface Color"], hex_to_rgba("#E88D72"))

    if emission_hex and emission_strength > 0.0:
        em_rgba = hex_to_rgba(emission_hex)
        set_principled_input(bsdf, ["Emission Color", "Emission"], em_rgba)
        set_principled_input(bsdf, ["Emission Strength"], emission_strength)

    if bump_scale > 0.0:
        tex_coord = nodes.new(type="ShaderNodeTexCoord")
        tex_coord.location = (-520, -180)
        noise = nodes.new(type="ShaderNodeTexNoise")
        noise.location = (-320, -180)
        noise.inputs["Scale"].default_value = noise_scale
        noise.inputs["Detail"].default_value = 6.0

        bump = nodes.new(type="ShaderNodeBump")
        bump.location = (-120, -180)
        bump.inputs["Strength"].default_value = bump_scale
        bump.inputs["Distance"].default_value = 0.02

        links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])
    return mat


def _build_canonical_armature(rig_name: str, height_scale: float = 1.0, is_cube_agent: bool = False) -> bpy.types.Object:
    arm_data = bpy.data.armatures.new(name=f"{rig_name}_ArmatureData")
    arm_obj = bpy.data.objects.new(name=rig_name, object_data=arm_data)
    bpy.context.collection.objects.link(arm_obj)

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    s = height_scale

    def add_bone(bname, head, tail, parent_name=None, connect=False):
        b = eb.new(bname)
        b.head = (head[0] * s, head[1] * s, head[2] * s)
        b.tail = (tail[0] * s, tail[1] * s, tail[2] * s)
        b.roll = 0.0
        if parent_name and parent_name in eb:
            b.parent = eb[parent_name]
            b.use_connect = connect
        return b

    if is_cube_agent:
        # Compact Cube Agent Hierarchy: pivots placed at exact centers of Nemo's facial & limb geometry
        add_bone("root", (0, 0, 0.0), (0, 0, 0.10))
        add_bone("hips", (0, 0, 0.22), (0, 0, 0.28), "root")
        add_bone("spine", (0, 0, 0.28), (0, 0, 0.34), "hips", True)
        add_bone("chest", (0, 0, 0.34), (0, 0, 0.40), "spine", True)
        add_bone("neck", (0, 0, 0.40), (0, 0, 0.44), "chest", True)
        add_bone("head", (0, 0, 0.44), (0, 0, 0.82), "neck", True)

        # Facial bones aligned with Nemo's front cube face (Y = -0.261 * s)
        add_bone("jaw", (0, -0.261, 0.48), (0, -0.261, 0.52), "head")
        add_bone("lip_upper", (0, -0.261, 0.50), (0, -0.261, 0.53), "head")
        add_bone("lip_lower", (0, -0.263, 0.466), (0, -0.263, 0.496), "jaw")
        add_bone("mouth_corner.L", (0.055, -0.261, 0.48), (0.055, -0.261, 0.51), "head")
        add_bone("mouth_corner.R", (-0.055, -0.261, 0.48), (-0.055, -0.261, 0.51), "head")

        add_bone("eye.L", (0.140, -0.262, 0.65), (0.140, -0.262, 0.70), "head")
        add_bone("eye.R", (-0.140, -0.262, 0.65), (-0.140, -0.262, 0.70), "head")
        add_bone("eyelid_upper.L", (0.140, -0.264, 0.715), (0.140, -0.264, 0.745), "head")
        add_bone("eyelid_upper.R", (-0.140, -0.264, 0.715), (-0.140, -0.264, 0.745), "head")
        add_bone("brow.L", (0.140, -0.266, 0.76), (0.140, -0.266, 0.79), "head")
        add_bone("brow.R", (-0.140, -0.266, 0.76), (-0.140, -0.266, 0.79), "head")

        # Side-arms parented to head cube so they move naturally with the cube body
        add_bone("shoulder.L", (0.30, 0, 0.58), (0.37, 0, 0.58), "head")
        add_bone("upper_arm.L", (0.37, 0, 0.58), (0.37, 0, 0.46), "shoulder.L", True)
        add_bone("forearm.L", (0.37, 0, 0.46), (0.37, 0, 0.36), "upper_arm.L", True)
        add_bone("hand.L", (0.37, 0, 0.36), (0.37, 0, 0.30), "forearm.L", True)

        add_bone("shoulder.R", (-0.30, 0, 0.58), (-0.37, 0, 0.58), "head")
        add_bone("upper_arm.R", (-0.37, 0, 0.58), (-0.37, 0, 0.46), "shoulder.R", True)
        add_bone("forearm.R", (-0.37, 0, 0.46), (-0.37, 0, 0.36), "upper_arm.R", True)
        add_bone("hand.R", (-0.37, 0, 0.36), (-0.37, 0, 0.30), "forearm.R", True)

        # 4 Stubby Legs parented to root so they stay 100% planted at Z=0.0
        add_bone("thigh.L", (0.18, -0.10, 0.30), (0.18, -0.10, 0.15), "root")
        add_bone("shin.L", (0.18, 0.11, 0.30), (0.18, 0.11, 0.05), "thigh.L")
        add_bone("foot.L", (0.18, -0.10, 0.05), (0.18, -0.18, 0.01), "shin.L")

        add_bone("thigh.R", (-0.18, -0.10, 0.30), (-0.18, -0.10, 0.15), "root")
        add_bone("shin.R", (-0.18, 0.11, 0.30), (-0.18, 0.11, 0.05), "thigh.R")
        add_bone("foot.R", (-0.18, -0.10, 0.05), (-0.18, -0.18, 0.01), "shin.R")
    else:
        # Humanoid Chibi Hierarchy (Leo)
        add_bone("root", (0, 0, 0.0), (0, 0, 0.12))
        add_bone("hips", (0, 0, 0.34), (0, 0, 0.46), "root")
        add_bone("spine", (0, 0, 0.46), (0, 0, 0.62), "hips", True)
        add_bone("chest", (0, 0, 0.62), (0, 0, 0.82), "spine", True)
        add_bone("neck", (0, 0, 0.82), (0, 0, 0.88), "chest", True)
        add_bone("head", (0, 0, 0.88), (0, 0, 1.32), "neck", True)

        # Facial Rig Bones placed at exact centers of Leo's facial features
        add_bone("jaw", (0, -0.221, 0.990), (0, -0.221, 1.020), "head")
        add_bone("lip_upper", (0, -0.221, 1.002), (0, -0.221, 1.025), "head")
        add_bone("lip_lower", (0, -0.223, 0.979), (0, -0.223, 1.002), "jaw")
        add_bone("mouth_corner.L", (0.048, -0.22, 0.990), (0.048, -0.22, 1.015), "head")
        add_bone("mouth_corner.R", (-0.048, -0.22, 0.990), (-0.048, -0.22, 1.015), "head")

        add_bone("eye.L", (0.110, -0.222, 1.095), (0.110, -0.222, 1.145), "head")
        add_bone("eye.R", (-0.110, -0.222, 1.095), (-0.110, -0.222, 1.145), "head")
        add_bone("eyelid_upper.L", (0.110, -0.224, 1.144), (0.110, -0.224, 1.174), "head")
        add_bone("eyelid_upper.R", (-0.110, -0.224, 1.144), (-0.110, -0.224, 1.174), "head")
        add_bone("brow.L", (0.110, -0.226, 1.176), (0.110, -0.226, 1.206), "head")
        add_bone("brow.R", (-0.110, -0.226, 1.176), (-0.110, -0.226, 1.206), "head")

        # Left & Right Arms
        add_bone("shoulder.L", (0.12, 0, 0.78), (0.24, 0, 0.78), "chest")
        add_bone("upper_arm.L", (0.24, 0, 0.78), (0.24, 0, 0.58), "shoulder.L", True)
        add_bone("forearm.L", (0.24, 0, 0.58), (0.24, 0, 0.42), "upper_arm.L", True)
        add_bone("hand.L", (0.24, 0, 0.42), (0.24, 0, 0.34), "forearm.L", True)

        add_bone("shoulder.R", (-0.12, 0, 0.78), (-0.24, 0, 0.78), "chest")
        add_bone("upper_arm.R", (-0.24, 0, 0.78), (-0.24, 0, 0.58), "shoulder.R", True)
        add_bone("forearm.R", (-0.24, 0, 0.58), (-0.24, 0, 0.42), "upper_arm.R", True)
        add_bone("hand.R", (-0.24, 0, 0.42), (-0.24, 0, 0.34), "forearm.R", True)

        # Left & Right Legs parented to "root" so upper-body motion never tilts or lifts the feet off Z=0.0
        add_bone("thigh.L", (0.095, 0, 0.34), (0.095, 0, 0.18), "root")
        add_bone("shin.L", (0.095, 0, 0.18), (0.095, 0, 0.05), "thigh.L", True)
        add_bone("foot.L", (0.095, 0, 0.05), (0.095, -0.14, 0.01), "shin.L", True)

        add_bone("thigh.R", (-0.095, 0, 0.34), (-0.095, 0, 0.18), "root")
        add_bone("shin.R", (-0.095, 0, 0.18), (-0.095, 0, 0.05), "thigh.R", True)
        add_bone("foot.R", (-0.095, 0, 0.05), (-0.095, -0.14, 0.01), "shin.R", True)

    bpy.ops.object.mode_set(mode="OBJECT")

    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "XYZ"

    return arm_obj


def _parent_mesh_to_bone(mesh_obj: bpy.types.Object, arm_obj: bpy.types.Object, bone_name: str, smooth: bool = True, subsurf_levels: int = 0):
    bpy.context.view_layer.objects.active = mesh_obj
    if subsurf_levels > 0:
        mod = mesh_obj.modifiers.new(name="Subsurf", type="SUBSURF")
        mod.levels = subsurf_levels
        mod.render_levels = subsurf_levels
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception:
            pass
    if smooth:
        for poly in mesh_obj.data.polygons:
            poly.use_smooth = True

    world_mat = mesh_obj.matrix_world.copy()
    mesh_obj.parent = arm_obj
    mesh_obj.parent_type = "BONE"
    mesh_obj.parent_bone = bone_name
    mesh_obj.matrix_world = world_mat


def _add_part_rounded_box(name: str, loc, scale, mat, arm_obj, bone_name: str, rot=(0, 0, 0), bevel_width: float = 0.018):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel_width > 0:
        bev = obj.modifiers.new(name="Bevel", type="BEVEL")
        bev.width = bevel_width
        bev.segments = 2
        try:
            bpy.ops.object.modifier_apply(modifier=bev.name)
        except Exception:
            pass
    obj.data.materials.append(mat)
    _parent_mesh_to_bone(obj, arm_obj, bone_name, smooth=True, subsurf_levels=0)
    return obj


def _add_part_pyramid_spike(name: str, loc, radius1: float, depth: float, mat, arm_obj, bone_name: str, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=radius1, radius2=0.01, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bev = obj.modifiers.new(name="Bevel", type="BEVEL")
    bev.width = 0.012
    bev.segments = 2
    try:
        bpy.ops.object.modifier_apply(modifier=bev.name)
    except Exception:
        pass
    obj.data.materials.append(mat)
    _parent_mesh_to_bone(obj, arm_obj, bone_name, smooth=True, subsurf_levels=0)
    return obj


def build_leo_character_rig(custom_colors=None) -> bpy.types.Object:
    """
    Constructs Leo_Rig (@agentmorphy Blocky Chibi Developer):
    - Wide cute beveled-box head (#F2C2A5) with 5 chunky dark-indigo pyramidal hair spikes (#1E1B4B)
    - Two vertical dark rectangular pixel eyes (#0B0F1E) + blocky brows (no nose block, matching @agentmorphy)
    - Clean articulated talking mouth cavity with subtle inner pink tongue
    - Cobalt-blue developer hoodie (#3B5BDB) with two crisp vertical white chest stripes (#F8FAFC)
    - Blocky blue arms with peach hands, dark blue pants, and chunky bright-white blocky sneakers (#F8FAFC)
    """
    arm_obj = _build_canonical_armature("Leo_Rig", height_scale=1.0, is_cube_agent=False)

    hoodie_hex = (custom_colors or {}).get("primaryColor", "#3B5BDB")
    if hoodie_hex.lower() in ("#2563eb", "#4f46e5"):
        hoodie_hex = "#3B5BDB"

    skin_mat = create_pbr_material("Leo_Skin", "#E8AD8E", roughness=0.55, subsurface=0.10)
    hair_mat = create_pbr_material("Leo_SpikyHair", "#1E1B4B", roughness=0.62, metallic=0.05)
    hoodie_mat = create_pbr_material("Leo_CobaltHoodie", hoodie_hex, roughness=0.58)
    pants_mat = create_pbr_material("Leo_BluePants", "#2541B2", roughness=0.65)
    white_mat = create_pbr_material("Leo_CrispWhite", "#F8FAFC", roughness=0.38)
    eye_mat = create_pbr_material("Leo_PixelEye", "#0B0F1E", roughness=0.15)
    mouth_mat = create_pbr_material("Leo_MouthDark", "#260B12", roughness=0.75)
    tongue_mat = create_pbr_material("Leo_Tongue", "#E11D48", roughness=0.50)

    # 1. Wide Blocky Chibi Head + Ears (Clean @agentmorphy aesthetic without protruding nose block)
    _add_part_rounded_box("Leo_Neck", (0, 0, 0.85), (0.14, 0.14, 0.08), skin_mat, arm_obj, "neck", bevel_width=0.015)
    _add_part_rounded_box("Leo_Head", (0, 0, 1.08), (0.48, 0.44, 0.40), skin_mat, arm_obj, "head", bevel_width=0.035)
    _add_part_rounded_box("Leo_Ear.L", (0.255, 0, 1.07), (0.055, 0.08, 0.10), skin_mat, arm_obj, "head", bevel_width=0.012)
    _add_part_rounded_box("Leo_Ear.R", (-0.255, 0, 1.07), (0.055, 0.08, 0.10), skin_mat, arm_obj, "head", bevel_width=0.012)

    # 2. Iconic @agentmorphy 5 Chunky Dark-Indigo Pyramidal Hair Spikes + Back Crown
    _add_part_rounded_box("Leo_HairCrown", (0, 0.02, 1.26), (0.50, 0.46, 0.11), hair_mat, arm_obj, "head", bevel_width=0.022)
    _add_part_rounded_box("Leo_HairBack", (0, 0.19, 1.13), (0.49, 0.12, 0.28), hair_mat, arm_obj, "head", bevel_width=0.020)

    spike_configs = [
        ("Leo_HairSpike_1", (-0.17, -0.05, 1.38), 0.125, 0.22, (0.16, -0.22, 0.35)),
        ("Leo_HairSpike_2", (-0.08, -0.08, 1.41), 0.130, 0.25, (0.20, -0.10, 0.55)),
        ("Leo_HairSpike_3", ( 0.02, -0.09, 1.42), 0.135, 0.26, (0.22,  0.04, 0.78)),
        ("Leo_HairSpike_4", ( 0.12, -0.07, 1.40), 0.130, 0.24, (0.18,  0.15, 0.95)),
        ("Leo_HairSpike_5", ( 0.20, -0.03, 1.36), 0.115, 0.20, (0.14,  0.26, 1.15)),
    ]
    for s_name, s_loc, s_rad, s_depth, s_rot in spike_configs:
        _add_part_pyramid_spike(s_name, s_loc, s_rad, s_depth, hair_mat, arm_obj, "head", rot=s_rot)

    # 3. Vertical Dark Rectangular Pixel Eyes + Eyelids + Blocky Brows
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_rounded_box(
            f"Leo_EyeBall.{side}",
            (sx * 0.110, -0.222, 1.095),
            (0.052, 0.024, 0.092),
            eye_mat,
            arm_obj,
            f"eye.{side}",
            bevel_width=0.005,
        )
        _add_part_rounded_box(
            f"Leo_EyeCatch.{side}",
            (sx * 0.110 + 0.010, -0.235, 1.120),
            (0.014, 0.008, 0.016),
            white_mat,
            arm_obj,
            f"eye.{side}",
            bevel_width=0.002,
        )
        _add_part_rounded_box(
            f"Leo_Eyelid.{side}",
            (sx * 0.110, -0.224, 1.144),
            (0.058, 0.028, 0.016),
            skin_mat,
            arm_obj,
            f"eyelid_upper.{side}",
            bevel_width=0.004,
        )
        _add_part_rounded_box(
            f"Leo_Brow.{side}",
            (sx * 0.110, -0.226, 1.176),
            (0.084, 0.026, 0.020),
            hair_mat,
            arm_obj,
            f"brow.{side}",
            bevel_width=0.004,
        )

    # 4. Clean @agentmorphy Articulated Mouth Cavity + Tongue (scales smoothly in-place around jaw pivot)
    _add_part_rounded_box("Leo_MouthCavity", (0, -0.221, 0.990), (0.088, 0.022, 0.030), mouth_mat, arm_obj, "jaw", bevel_width=0.004)
    _add_part_rounded_box("Leo_Tongue", (0, -0.223, 0.980), (0.054, 0.020, 0.010), tongue_mat, arm_obj, "lip_lower", bevel_width=0.002)

    # 5. Cobalt-Blue Hoodie Torso + Two Crisp Vertical White Collar/Drawstring Stripes
    _add_part_rounded_box("Leo_Pelvis", (0, 0, 0.37), (0.34, 0.24, 0.14), pants_mat, arm_obj, "hips", bevel_width=0.018)
    _add_part_rounded_box("Leo_Abdomen", (0, 0, 0.53), (0.38, 0.28, 0.22), hoodie_mat, arm_obj, "spine", bevel_width=0.022)
    _add_part_rounded_box("Leo_Chest", (0, 0, 0.71), (0.40, 0.30, 0.26), hoodie_mat, arm_obj, "chest", bevel_width=0.025)
    # Two vertical white chest stripes (exact @agentmorphy signature detail)
    _add_part_rounded_box("Leo_WhiteStripe.L", (0.058, -0.152, 0.70), (0.032, 0.022, 0.19), white_mat, arm_obj, "chest", bevel_width=0.004)
    _add_part_rounded_box("Leo_WhiteStripe.R", (-0.058, -0.152, 0.70), (0.032, 0.022, 0.19), white_mat, arm_obj, "chest", bevel_width=0.004)
    _add_part_rounded_box("Leo_HoodieCollar", (0, 0.04, 0.83), (0.32, 0.24, 0.07), hoodie_mat, arm_obj, "chest", bevel_width=0.015)

    # 6. Blocky Blue Hoodie Sleeves & Peach Hands
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_rounded_box(f"Leo_Shoulder.{side}", (sx * 0.23, 0, 0.76), (0.12, 0.12, 0.12), hoodie_mat, arm_obj, f"shoulder.{side}", bevel_width=0.018)
        _add_part_rounded_box(f"Leo_UpperArm.{side}", (sx * 0.24, 0, 0.67), (0.115, 0.115, 0.20), hoodie_mat, arm_obj, f"upper_arm.{side}", bevel_width=0.016)
        _add_part_rounded_box(f"Leo_Forearm.{side}", (sx * 0.24, 0, 0.50), (0.108, 0.108, 0.18), hoodie_mat, arm_obj, f"forearm.{side}", bevel_width=0.015)
        _add_part_rounded_box(f"Leo_Hand.{side}", (sx * 0.24, 0, 0.37), (0.095, 0.095, 0.095), skin_mat, arm_obj, f"hand.{side}", bevel_width=0.016)

    # 7. Blocky Blue Pants & Chunky Bright-White Sneakers (Planted at Z=0.0)
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_rounded_box(f"Leo_Thigh.{side}", (sx * 0.095, 0, 0.26), (0.135, 0.145, 0.18), pants_mat, arm_obj, f"thigh.{side}", bevel_width=0.015)
        _add_part_rounded_box(f"Leo_Shin.{side}", (sx * 0.095, 0, 0.12), (0.130, 0.140, 0.16), pants_mat, arm_obj, f"shin.{side}", bevel_width=0.015)
        _add_part_rounded_box(f"Leo_Sneaker.{side}", (sx * 0.095, -0.025, 0.045), (0.148, 0.210, 0.090), white_mat, arm_obj, f"foot.{side}", bevel_width=0.016)

    return arm_obj


def build_nemo_character_rig(custom_colors=None) -> bpy.types.Object:
    """
    Constructs Nemo_Rig (@agentmorphy Cute Coral-Terracotta 3D Cube AI Agent):
    - Single unified wide warm coral-terracotta 3D cube body (#D96043) with warm golden right bevel (#EA7B5F)
    - Two vertical dark rectangular pixel eyes (#18131A) + expressive blocky brows
    - Clean articulated rectangular lip-sync mouth cavity with subtle inner pink tongue
    - Two cute stubby waving side-arms + 4 stubby blocky legs planted firmly at Z=0.0
    """
    arm_obj = _build_canonical_armature("Nemo_Rig", height_scale=0.82, is_cube_agent=True)
    s = 0.82

    coral_mat = create_pbr_material("Nemo_CoralBody", "#D96043", roughness=0.50, metallic=0.04)
    coral_warm_mat = create_pbr_material("Nemo_CoralWarmSide", "#EA7B5F", roughness=0.46, metallic=0.04)
    coral_dark_mat = create_pbr_material("Nemo_CoralLimb", "#C24E33", roughness=0.54, metallic=0.04)
    eye_mat = create_pbr_material("Nemo_PixelEye", "#18131A", roughness=0.14)
    white_mat = create_pbr_material("Nemo_Catchlight", "#F8FAFC", roughness=0.20)
    mouth_mat = create_pbr_material("Nemo_MouthDark", "#230D13", roughness=0.72)
    tongue_mat = create_pbr_material("Nemo_Tongue", "#F43F5E", roughness=0.45)

    # 1. Unified @agentmorphy Wide Coral-Terracotta 3D Cube Body sitting directly on 4 stubby legs
    _add_part_rounded_box("Nemo_HeadCube", (0, 0, 0.58 * s), (0.68 * s, 0.52 * s, 0.58 * s), coral_mat, arm_obj, "head", bevel_width=0.036)
    _add_part_rounded_box("Nemo_WarmSideBevel", (-0.325 * s, 0, 0.58 * s), (0.045 * s, 0.48 * s, 0.54 * s), coral_warm_mat, arm_obj, "head", bevel_width=0.012)

    # 2. Two Vertical Dark Rectangular Pixel Eyes + Eyelids + Blocky Brows on front of Unified Cube
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_rounded_box(
            f"Nemo_EyeGlow.{side}",
            (sx * 0.140 * s, -0.262 * s, 0.65 * s),
            (0.064 * s, 0.028 * s, 0.125 * s),
            eye_mat,
            arm_obj,
            f"eye.{side}",
            bevel_width=0.005,
        )
        _add_part_rounded_box(
            f"Nemo_EyeCatch.{side}",
            ((sx * 0.140 + 0.012) * s, -0.275 * s, 0.685 * s),
            (0.016 * s, 0.008 * s, 0.020 * s),
            white_mat,
            arm_obj,
            f"eye.{side}",
            bevel_width=0.002,
        )
        _add_part_rounded_box(
            f"Nemo_EyelidShutter.{side}",
            (sx * 0.140 * s, -0.264 * s, 0.715 * s),
            (0.072 * s, 0.030 * s, 0.018 * s),
            coral_dark_mat,
            arm_obj,
            f"eyelid_upper.{side}",
            bevel_width=0.004,
        )
        _add_part_rounded_box(
            f"Nemo_BrowPlate.{side}",
            (sx * 0.140 * s, -0.266 * s, 0.76 * s),
            (0.092 * s, 0.028 * s, 0.022 * s),
            coral_dark_mat,
            arm_obj,
            f"brow.{side}",
            bevel_width=0.004,
        )

    # 3. Clean Articulated Rectangular Viseme Mouth Cavity & Inner Tongue (pivots at exact center of mouth)
    _add_part_rounded_box("Nemo_MouthCavity", (0, -0.261 * s, 0.48 * s), (0.115 * s, 0.026 * s, 0.036 * s), mouth_mat, arm_obj, "jaw", bevel_width=0.004)
    _add_part_rounded_box("Nemo_Tongue", (0, -0.263 * s, 0.468 * s), (0.070 * s, 0.022 * s, 0.012 * s), tongue_mat, arm_obj, "lip_lower", bevel_width=0.002)

    # 4. Cute Stubby Waving Side-Arms emerging from the sides of the Cube
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_rounded_box(f"Nemo_UpperArm.{side}", (sx * 0.37 * s, 0, 0.54 * s), (0.115 * s, 0.120 * s, 0.14 * s), coral_dark_mat, arm_obj, f"upper_arm.{side}", bevel_width=0.015)
        _add_part_rounded_box(f"Nemo_Forearm.{side}", (sx * 0.38 * s, 0, 0.43 * s), (0.110 * s, 0.115 * s, 0.12 * s), coral_mat, arm_obj, f"forearm.{side}", bevel_width=0.015)
        _add_part_rounded_box(f"Nemo_Hand.{side}", (sx * 0.38 * s, 0, 0.34 * s), (0.105 * s, 0.110 * s, 0.090 * s), coral_warm_mat, arm_obj, f"hand.{side}", bevel_width=0.015)

    # 5. Four Cute Stubby Blocky Legs Underneath (Planted firmly at Z=0.0)
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_rounded_box(f"Nemo_Thigh.{side}", (sx * 0.18 * s, -0.10 * s, 0.16 * s), (0.120 * s, 0.120 * s, 0.30 * s), coral_dark_mat, arm_obj, f"thigh.{side}", bevel_width=0.014)
        _add_part_rounded_box(f"Nemo_Shin.{side}", (sx * 0.18 * s, 0.11 * s, 0.16 * s), (0.118 * s, 0.118 * s, 0.30 * s), coral_dark_mat, arm_obj, f"shin.{side}", bevel_width=0.014)
        _add_part_rounded_box(f"Nemo_Boot.{side}", (sx * 0.18 * s, -0.10 * s, 0.042 * s), (0.126 * s, 0.136 * s, 0.084 * s), coral_dark_mat, arm_obj, f"foot.{side}", bevel_width=0.014)

    return arm_obj


def import_or_build_character(char_config: dict) -> bpy.types.Object:
    """
    Resolves a character asset from char_config:
    1. If an external .blend or .glb asset path is provided and exists on disk, imports and validates it.
    2. Otherwise builds the studio's articulated Armature rig for Nemo (coral cube AI companion) or Leo (blocky chibi developer).
    """
    char_id = char_config.get("id", "").lower()
    char_name = char_config.get("name", "Character")
    ext_path = char_config.get("blendFilePath") or char_config.get("glbFilePath")

    if ext_path and os.path.exists(ext_path):
        try:
            if ext_path.endswith(".glb") or ext_path.endswith(".gltf"):
                bpy.ops.import_scene.gltf(filepath=ext_path)
                imported_obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
                if imported_obj:
                    imported_obj.name = f"{char_name}_Rig"
                    return imported_obj
        except Exception as exc:
            print(f"[AetherFrame] Warning: External character import failed ({exc}), using studio Armature rig.")

    if "nemo" in char_id or "nemo" in char_name.lower() or char_config.get("archetype") == "robot-companion":
        return build_nemo_character_rig(char_config)
    return build_leo_character_rig(char_config)
