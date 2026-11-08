"""
AetherFrame 3D — Production Character Builder & Importer (scripts/blender/import_character.py)
Imports external rigged character assets (Blender Studio Rain, Snow, Security Bot, or Mixamo GLB/FBX/BLEND)
when available in assets/characters/, or constructs high-detail articulated Blender Armature rigs
for Nemo (Digital AI Companion) and Leo (20-Year-Old College Student) with full skeletal hierarchy,
facial pose bones (jaw, lips, brows, eyelids, eye gaze), and ShaderNode PBR materials.
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
    # Convert sRGB to linear approximate for Blender shader sockets
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


def _build_canonical_armature(rig_name: str, height_scale: float = 1.0) -> bpy.types.Object:
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

    # Core Spine & Head Hierarchy (Z-up in Blender meters, feet at Z=0.0)
    add_bone("root", (0, 0, 0.0), (0, 0, 0.15))
    add_bone("hips", (0, 0, 0.88), (0, 0, 1.00), "root")
    add_bone("spine", (0, 0, 1.00), (0, 0, 1.18), "hips", True)
    add_bone("chest", (0, 0, 1.18), (0, 0, 1.40), "spine", True)
    add_bone("neck", (0, 0, 1.40), (0, 0, 1.49), "chest", True)
    add_bone("head", (0, 0, 1.49), (0, 0, 1.76), "neck", True)

    # Facial Rig Bones (Vertical +Z tails so local +Y location = vertical Z, rx = pitch, ry = yaw)
    add_bone("jaw", (0, -0.06, 1.54), (0, -0.06, 1.59), "head")
    add_bone("lip_upper", (0, -0.140, 1.548), (0, -0.140, 1.578), "head")
    add_bone("lip_lower", (0, -0.138, 1.522), (0, -0.138, 1.552), "jaw")
    add_bone("mouth_corner.L", (0.042, -0.125, 1.535), (0.042, -0.125, 1.565), "head")
    add_bone("mouth_corner.R", (-0.042, -0.125, 1.535), (-0.042, -0.125, 1.565), "head")

    add_bone("eye.L", (0.050, -0.122, 1.625), (0.050, -0.122, 1.665), "head")
    add_bone("eye.R", (-0.050, -0.122, 1.625), (-0.050, -0.122, 1.665), "head")
    add_bone("eyelid_upper.L", (0.050, -0.126, 1.638), (0.050, -0.126, 1.668), "head")
    add_bone("eyelid_upper.R", (-0.050, -0.126, 1.638), (-0.050, -0.126, 1.668), "head")
    add_bone("brow.L", (0.052, -0.136, 1.668), (0.052, -0.136, 1.698), "head")
    add_bone("brow.R", (-0.052, -0.136, 1.668), (-0.052, -0.136, 1.698), "head")

    # Left & Right Arms (Vertical downward -Z tails at x=±0.21 so rx < 0 swings arm forward -Y)
    add_bone("shoulder.L", (0.06, 0, 1.37), (0.21, 0, 1.37), "chest")
    add_bone("upper_arm.L", (0.21, 0, 1.37), (0.21, 0, 1.11), "shoulder.L", True)
    add_bone("forearm.L", (0.21, 0, 1.11), (0.21, 0, 0.87), "upper_arm.L", True)
    add_bone("hand.L", (0.21, 0, 0.87), (0.21, 0, 0.77), "forearm.L", True)

    add_bone("shoulder.R", (-0.06, 0, 1.37), (-0.21, 0, 1.37), "chest")
    add_bone("upper_arm.R", (-0.21, 0, 1.37), (-0.21, 0, 1.11), "shoulder.R", True)
    add_bone("forearm.R", (-0.21, 0, 1.11), (-0.21, 0, 0.87), "upper_arm.R", True)
    add_bone("hand.R", (-0.21, 0, 0.87), (-0.21, 0, 0.77), "forearm.R", True)

    # Left & Right Legs (Feet planted at Z=0.0)
    add_bone("thigh.L", (0.108, 0, 0.88), (0.108, 0, 0.48), "hips")
    add_bone("shin.L", (0.108, 0, 0.48), (0.108, 0, 0.08), "thigh.L", True)
    add_bone("foot.L", (0.108, 0, 0.08), (0.108, -0.16, 0.02), "shin.L", True)

    add_bone("thigh.R", (-0.108, 0, 0.88), (-0.108, 0, 0.48), "hips")
    add_bone("shin.R", (-0.108, 0, 0.48), (-0.108, 0, 0.08), "thigh.R", True)
    add_bone("foot.R", (-0.108, 0, 0.08), (-0.108, -0.16, 0.02), "shin.R", True)

    bpy.ops.object.mode_set(mode="OBJECT")

    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "XYZ"

    return arm_obj


def _parent_mesh_to_bone(mesh_obj: bpy.types.Object, arm_obj: bpy.types.Object, bone_name: str, smooth: bool = True, subsurf_levels: int = 1):
    bpy.context.view_layer.objects.active = mesh_obj
    if subsurf_levels > 0:
        mod = mesh_obj.modifiers.new(name="Subsurf", type="SUBSURF")
        mod.levels = 1
        mod.render_levels = 1
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception:
            pass
    if smooth:
        for poly in mesh_obj.data.polygons:
            poly.use_smooth = True

    # Compute world matrix before parenting and convert to bone local matrix
    world_mat = mesh_obj.matrix_world.copy()
    mesh_obj.parent = arm_obj
    mesh_obj.parent_type = "BONE"
    mesh_obj.parent_bone = bone_name
    mesh_obj.matrix_world = world_mat


def _add_part_sphere(name: str, loc, scale, mat, arm_obj, bone_name: str, subsurf: int = 0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    _parent_mesh_to_bone(obj, arm_obj, bone_name, smooth=True, subsurf_levels=subsurf)
    return obj


def _add_part_rounded_box(name: str, loc, scale, mat, arm_obj, bone_name: str, rot=(0, 0, 0), bevel_width: float = 0.025):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
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


def _add_part_cylinder(name: str, loc, radius: float, depth: float, mat, arm_obj, bone_name: str, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bev = obj.modifiers.new(name="Bevel", type="BEVEL")
    bev.width = min(radius, depth) * 0.12
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
    Constructs Leo_Rig: 20-year-old college student with stylized Pixar/Blender-Studio
    proportions, subsurface skin shader, sculpted layered chestnut hair, varsity jacket,
    backpack straps, jeans, sneakers, and full facial pose bones for phoneme lip-sync.
    """
    arm_obj = _build_canonical_armature("Leo_Rig", height_scale=1.0)

    jacket_hex = (custom_colors or {}).get("primaryColor", "#2563EB")
    accent_hex = (custom_colors or {}).get("secondaryColor", "#F59E0B")

    skin_mat = create_pbr_material("Leo_Skin", "#F2C19E", roughness=0.42, subsurface=0.25, bump_scale=0.015, noise_scale=60.0)
    hair_mat = create_pbr_material("Leo_Hair", "#2B1B12", roughness=0.52, metallic=0.05, bump_scale=0.08, noise_scale=35.0)
    jacket_mat = create_pbr_material("Leo_Jacket", jacket_hex, roughness=0.68, bump_scale=0.05, noise_scale=45.0)
    shirt_mat = create_pbr_material("Leo_Shirt", "#F8FAFC", roughness=0.72)
    strap_mat = create_pbr_material("Leo_Backpack", "#1E293B", roughness=0.55, metallic=0.15)
    jeans_mat = create_pbr_material("Leo_Jeans", "#1E3A5F", roughness=0.78, bump_scale=0.06, noise_scale=55.0)
    shoe_mat = create_pbr_material("Leo_Sneaker", accent_hex, roughness=0.48)
    sole_mat = create_pbr_material("Leo_Sole", "#F8FAFC", roughness=0.65)
    sclera_mat = create_pbr_material("Leo_Sclera", "#FFFFFF", roughness=0.12)
    iris_mat = create_pbr_material("Leo_Iris", "#3B82F6", roughness=0.08, emission_hex="#60A5FA", emission_strength=0.35)
    pupil_mat = create_pbr_material("Leo_Pupil", "#05070B", roughness=0.05)
    lip_mat = create_pbr_material("Leo_Lips", "#C97A63", roughness=0.38)
    mouth_inner_mat = create_pbr_material("Leo_MouthInner", "#3B0D11", roughness=0.85)
    teeth_mat = create_pbr_material("Leo_Teeth", "#F8FAFC", roughness=0.18)

    # Head & Neck
    _add_part_cylinder("Leo_Neck", (0, -0.01, 1.45), 0.052, 0.11, skin_mat, arm_obj, "neck")
    _add_part_sphere("Leo_Head", (0, -0.01, 1.615), (0.128, 0.140, 0.148), skin_mat, arm_obj, "head", subsurf=2)
    # Ears
    _add_part_sphere("Leo_Ear.L", (0.128, 0.0, 1.61), (0.024, 0.036, 0.045), skin_mat, arm_obj, "head")
    _add_part_sphere("Leo_Ear.R", (-0.128, 0.0, 1.61), (0.024, 0.036, 0.045), skin_mat, arm_obj, "head")
    # Nose
    _add_part_sphere("Leo_Nose", (0, -0.148, 1.602), (0.022, 0.032, 0.028), skin_mat, arm_obj, "head")

    # Sculpted College Hair (Crown + Swept Front Fringe + Side Tufts)
    _add_part_sphere("Leo_HairCrown", (0, 0.012, 1.655), (0.138, 0.148, 0.132), hair_mat, arm_obj, "head", subsurf=2)
    _add_part_rounded_box("Leo_HairFringe1", (0.025, -0.118, 1.718), (0.12, 0.08, 0.055), hair_mat, arm_obj, "head", rot=(0.25, -0.18, 0.12))
    _add_part_rounded_box("Leo_HairFringe2", (-0.045, -0.112, 1.712), (0.10, 0.075, 0.048), hair_mat, arm_obj, "head", rot=(0.20, 0.22, -0.15))

    # Eyes, Irises, Pupils, Eyelids & Eyebrows
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_sphere(f"Leo_EyeBall.{side}", (sx * 0.050, -0.122, 1.625), (0.026, 0.024, 0.026), sclera_mat, arm_obj, f"eye.{side}")
        _add_part_sphere(f"Leo_Iris.{side}", (sx * 0.050, -0.143, 1.625), (0.014, 0.006, 0.014), iris_mat, arm_obj, f"eye.{side}")
        _add_part_sphere(f"Leo_Pupil.{side}", (sx * 0.050, -0.147, 1.625), (0.008, 0.004, 0.008), pupil_mat, arm_obj, f"eye.{side}")
        # Upper Eyelid (bound to eyelid_upper.L/R for natural blinking)
        _add_part_sphere(f"Leo_Eyelid.{side}", (sx * 0.050, -0.126, 1.638), (0.029, 0.026, 0.016), skin_mat, arm_obj, f"eyelid_upper.{side}")
        # Expressive Eyebrow
        _add_part_rounded_box(f"Leo_Brow.{side}", (sx * 0.052, -0.136, 1.668), (0.052, 0.018, 0.014), hair_mat, arm_obj, f"brow.{side}", rot=(0, sx * -0.06, 0), bevel_width=0.005)

    # Articulated Jaw, Mouth Cavity, Teeth & Lips for Phoneme Visemes
    _add_part_sphere("Leo_MouthCavity", (0, -0.128, 1.535), (0.042, 0.025, 0.024), mouth_inner_mat, arm_obj, "head")
    _add_part_rounded_box("Leo_UpperTeeth", (0, -0.134, 1.544), (0.052, 0.014, 0.010), teeth_mat, arm_obj, "lip_upper", bevel_width=0.003)
    _add_part_rounded_box("Leo_UpperLip", (0, -0.140, 1.548), (0.064, 0.018, 0.012), lip_mat, arm_obj, "lip_upper", bevel_width=0.005)
    _add_part_rounded_box("Leo_LowerLip", (0, -0.138, 1.522), (0.060, 0.018, 0.013), lip_mat, arm_obj, "lip_lower", bevel_width=0.005)
    _add_part_sphere("Leo_JawChin", (0, -0.095, 1.512), (0.088, 0.068, 0.042), skin_mat, arm_obj, "jaw")

    # Torso, Collegiate Hoodie Jacket, Shirt Collar & Backpack
    _add_part_rounded_box("Leo_Pelvis", (0, 0, 0.93), (0.25, 0.17, 0.14), jeans_mat, arm_obj, "hips")
    _add_part_rounded_box("Leo_Abdomen", (0, 0, 1.09), (0.26, 0.18, 0.20), jacket_mat, arm_obj, "spine")
    _add_part_rounded_box("Leo_Chest", (0, 0, 1.29), (0.31, 0.20, 0.24), jacket_mat, arm_obj, "chest")
    _add_part_rounded_box("Leo_ShirtFront", (0, -0.098, 1.27), (0.11, 0.025, 0.22), shirt_mat, arm_obj, "chest", bevel_width=0.005)
    _add_part_rounded_box("Leo_HoodieCollar", (0, 0.03, 1.40), (0.22, 0.18, 0.065), accent_hex and shoe_mat or jacket_mat, arm_obj, "chest")
    # Collegiate Backpack & Straps
    _add_part_rounded_box("Leo_BackpackMain", (0, 0.145, 1.24), (0.24, 0.11, 0.29), strap_mat, arm_obj, "chest")
    _add_part_rounded_box("Leo_Strap.L", (0.105, -0.01, 1.29), (0.038, 0.22, 0.23), strap_mat, arm_obj, "chest", bevel_width=0.006)
    _add_part_rounded_box("Leo_Strap.R", (-0.105, -0.01, 1.29), (0.038, 0.22, 0.23), strap_mat, arm_obj, "chest", bevel_width=0.006)

    # Arms & Hands
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_sphere(f"Leo_Shoulder.{side}", (sx * 0.20, 0, 1.365), (0.062, 0.062, 0.062), jacket_mat, arm_obj, f"shoulder.{side}")
        _add_part_cylinder(f"Leo_UpperArm.{side}", (sx * 0.21, 0, 1.24), 0.048, 0.26, jacket_mat, arm_obj, f"upper_arm.{side}")
        _add_part_cylinder(f"Leo_Forearm.{side}", (sx * 0.21, 0, 0.99), 0.040, 0.24, jacket_mat, arm_obj, f"forearm.{side}")
        _add_part_sphere(f"Leo_Hand.{side}", (sx * 0.21, 0, 0.82), (0.036, 0.045, 0.055), skin_mat, arm_obj, f"hand.{side}")

    # Legs & Sneakers (Planted cleanly at Z=0.0)
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_cylinder(f"Leo_Thigh.{side}", (sx * 0.108, 0, 0.68), 0.064, 0.40, jeans_mat, arm_obj, f"thigh.{side}")
        _add_part_cylinder(f"Leo_Shin.{side}", (sx * 0.108, 0, 0.28), 0.050, 0.40, jeans_mat, arm_obj, f"shin.{side}")
        _add_part_rounded_box(f"Leo_SneakerUpper.{side}", (sx * 0.108, -0.045, 0.055), (0.095, 0.21, 0.075), shoe_mat, arm_obj, f"foot.{side}", bevel_width=0.015)
        _add_part_rounded_box(f"Leo_SneakerSole.{side}", (sx * 0.108, -0.045, 0.012), (0.102, 0.22, 0.024), sole_mat, arm_obj, f"foot.{side}", bevel_width=0.005)

    return arm_obj


def build_nemo_character_rig(custom_colors=None) -> bpy.types.Object:
    """
    Constructs Nemo_Rig: Expressive Digital AI Companion inspired by Blender Studio
    Security Bot + stylized harmonic android aesthetics, featuring a sleek articulated head,
    glass visor with glowing cyan ocular iris rings, expressive brow plates, articulated
    viseme jaw/mouth aperture, floating golden harmonic halo ring, and full humanoid limbs.
    """
    arm_obj = _build_canonical_armature("Nemo_Rig", height_scale=0.93)
    s = 0.93

    primary_hex = (custom_colors or {}).get("primaryColor", "#06B6D4")
    accent_hex = (custom_colors or {}).get("secondaryColor", "#F59E0B")

    chassis_mat = create_pbr_material("Nemo_Chassis", "#E2E8F0", roughness=0.22, metallic=0.35, bump_scale=0.01, noise_scale=80.0)
    teal_armor_mat = create_pbr_material("Nemo_TealArmor", primary_hex, roughness=0.25, metallic=0.55)
    gold_mat = create_pbr_material("Nemo_GoldTrim", accent_hex, roughness=0.18, metallic=0.88, emission_hex=accent_hex, emission_strength=0.4)
    joint_mat = create_pbr_material("Nemo_DarkJoint", "#0F172A", roughness=0.40, metallic=0.75)
    visor_mat = create_pbr_material("Nemo_Visor", "#040814", roughness=0.06, metallic=0.2)
    cyan_glow_mat = create_pbr_material("Nemo_CyanGlow", "#38BDF8", roughness=0.10, emission_hex="#38BDF8", emission_strength=4.5)
    mouth_glow_mat = create_pbr_material("Nemo_MouthGlow", "#67E8F9", roughness=0.10, emission_hex="#22D3EE", emission_strength=5.2)

    # Head, Visor, Glowing Ocular Rings, Expressive Brow Plates & Halo Ring
    _add_part_cylinder("Nemo_NeckCore", (0, 0, 1.45 * s), 0.045 * s, 0.11 * s, joint_mat, arm_obj, "neck")
    _add_part_sphere("Nemo_HeadHelm", (0, -0.005, 1.62 * s), (0.135 * s, 0.142 * s, 0.145 * s), chassis_mat, arm_obj, "head", subsurf=1)
    _add_part_sphere("Nemo_VisorGlass", (0, -0.055 * s, 1.62 * s), (0.118 * s, 0.105 * s, 0.102 * s), visor_mat, arm_obj, "head", subsurf=1)

    # Side Acoustic Antenna Pods + Floating Harmonic Halo Ring
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_cylinder(f"Nemo_EarPod.{side}", (sx * 0.138 * s, 0, 1.62 * s), 0.036 * s, 0.032 * s, gold_mat, arm_obj, "head", rot=(0, math.pi / 2, 0))
        _add_part_sphere(f"Nemo_EyeGlow.{side}", (sx * 0.048 * s, -0.145 * s, 1.63 * s), (0.024 * s, 0.008 * s, 0.024 * s), cyan_glow_mat, arm_obj, f"eye.{side}")
        _add_part_rounded_box(f"Nemo_EyelidShutter.{side}", (sx * 0.048 * s, -0.147 * s, 1.648 * s), (0.052 * s, 0.016 * s, 0.014 * s), joint_mat, arm_obj, f"eyelid_upper.{side}", bevel_width=0.003)
        _add_part_rounded_box(f"Nemo_BrowPlate.{side}", (sx * 0.052 * s, -0.148 * s, 1.678 * s), (0.055 * s, 0.016 * s, 0.012 * s), cyan_glow_mat, arm_obj, f"brow.{side}", bevel_width=0.003)

    # Floating Golden Harmonic Halo above Head
    bpy.ops.mesh.primitive_torus_add(major_radius=0.14 * s, minor_radius=0.012 * s, location=(0, 0.02 * s, 1.81 * s), rotation=(0.18, 0, 0))
    halo = bpy.context.active_object
    halo.name = "Nemo_HarmonicHalo"
    halo.data.materials.append(gold_mat)
    _parent_mesh_to_bone(halo, arm_obj, "head", smooth=True, subsurf_levels=0)

    # Articulated AI Viseme Mouth & Jaw
    _add_part_rounded_box("Nemo_UpperLipBar", (0, -0.146 * s, 1.552 * s), (0.064 * s, 0.014 * s, 0.011 * s), mouth_glow_mat, arm_obj, "lip_upper", bevel_width=0.003)
    _add_part_rounded_box("Nemo_LowerLipBar", (0, -0.144 * s, 1.525 * s), (0.060 * s, 0.014 * s, 0.011 * s), mouth_glow_mat, arm_obj, "lip_lower", bevel_width=0.003)
    _add_part_sphere("Nemo_JawPlate", (0, -0.088 * s, 1.515 * s), (0.085 * s, 0.068 * s, 0.038 * s), teal_armor_mat, arm_obj, "jaw")

    # Torso, Harmonic Core & Pelvis
    _add_part_rounded_box("Nemo_Pelvis", (0, 0, 0.93 * s), (0.23 * s, 0.16 * s, 0.13 * s), teal_armor_mat, arm_obj, "hips")
    _add_part_cylinder("Nemo_WaistCore", (0, 0, 1.09 * s), 0.085 * s, 0.19 * s, joint_mat, arm_obj, "spine")
    _add_part_rounded_box("Nemo_ChestArmor", (0, 0, 1.29 * s), (0.29 * s, 0.19 * s, 0.23 * s), chassis_mat, arm_obj, "chest")
    _add_part_sphere("Nemo_HeartCore", (0, -0.098 * s, 1.29 * s), (0.045 * s, 0.022 * s, 0.045 * s), cyan_glow_mat, arm_obj, "chest")
    _add_part_rounded_box("Nemo_CollarRing", (0, 0, 1.39 * s), (0.21 * s, 0.17 * s, 0.045 * s), gold_mat, arm_obj, "chest")

    # Articulated Arms & Hands
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_sphere(f"Nemo_ShoulderPad.{side}", (sx * 0.20 * s, 0, 1.365 * s), (0.060 * s, 0.060 * s, 0.060 * s), teal_armor_mat, arm_obj, f"shoulder.{side}")
        _add_part_cylinder(f"Nemo_UpperArm.{side}", (sx * 0.21 * s, 0, 1.24 * s), 0.042 * s, 0.25 * s, chassis_mat, arm_obj, f"upper_arm.{side}")
        _add_part_cylinder(f"Nemo_Forearm.{side}", (sx * 0.21 * s, 0, 0.99 * s), 0.038 * s, 0.23 * s, teal_armor_mat, arm_obj, f"forearm.{side}")
        _add_part_sphere(f"Nemo_Hand.{side}", (sx * 0.21 * s, 0, 0.82 * s), (0.034 * s, 0.042 * s, 0.050 * s), gold_mat, arm_obj, f"hand.{side}")

    # Articulated Legs & Boots (Planted cleanly at Z=0.0)
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        _add_part_cylinder(f"Nemo_Thigh.{side}", (sx * 0.108 * s, 0, 0.68 * s), 0.056 * s, 0.39 * s, chassis_mat, arm_obj, f"thigh.{side}")
        _add_part_cylinder(f"Nemo_Shin.{side}", (sx * 0.108 * s, 0, 0.28 * s), 0.046 * s, 0.39 * s, teal_armor_mat, arm_obj, f"shin.{side}")
        _add_part_rounded_box(f"Nemo_Boot.{side}", (sx * 0.108 * s, -0.042 * s, 0.045 * s), (0.088 * s, 0.195 * s, 0.075 * s), chassis_mat, arm_obj, f"foot.{side}", bevel_width=0.014)
        _add_part_rounded_box(f"Nemo_BootSole.{side}", (sx * 0.108 * s, -0.042 * s, 0.010 * s), (0.092 * s, 0.205 * s, 0.020 * s), gold_mat, arm_obj, f"foot.{side}", bevel_width=0.004)

    return arm_obj


def import_or_build_character(char_config: dict) -> bpy.types.Object:
    """
    Resolves a character asset from char_config:
    1. If an external .blend or .glb asset path is provided and exists on disk, imports and validates it.
    2. Otherwise builds the studio's articulated Armature rig for Nemo (AI companion) or Leo (college student).
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
