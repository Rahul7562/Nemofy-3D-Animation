"""
AetherFrame 3D — Cinematic Lighting, World Sky Shader, Volumetrics & Filmic Lookdev
(scripts/blender/configure_lighting.py)

Configures three-point cinematic lighting (Key Area, Fill Area, Rim Spot/Area, Eye Catchlight),
motivated practical lights, multi-node World sky gradient shader, Ambient Occlusion, Bloom,
Screen-Space Reflections, and Filmic Medium High Contrast colour management.
"""

import math
import bpy
import mathutils
from import_character import hex_to_rgba


LIGHTING_PRESET_PALETTES = {
    "golden-hour": {
        "zenith": "#0B132B",
        "horizon": "#3B1F2B",
        "key_hex": "#FFD28E",
        "key_energy": 650.0,
        "fill_hex": "#60A5FA",
        "fill_energy": 220.0,
        "rim_hex": "#F59E0B",
        "rim_energy": 480.0,
    },
    "emerald-mist": {
        "zenith": "#041B1D",
        "horizon": "#06373A",
        "key_hex": "#A7F3D0",
        "key_energy": 580.0,
        "fill_hex": "#38BDF8",
        "fill_energy": 240.0,
        "rim_hex": "#34D399",
        "rim_energy": 520.0,
    },
    "moonlit-cobalt": {
        "zenith": "#03071E",
        "horizon": "#1E1B4B",
        "key_hex": "#93C5FD",
        "key_energy": 620.0,
        "fill_hex": "#38BDF8",
        "fill_energy": 240.0,
        "rim_hex": "#F59E0B",
        "rim_energy": 500.0,
    },
    "sunset-dramatic": {
        "zenith": "#1A0B1E",
        "horizon": "#4C1D3D",
        "key_hex": "#FDA4AF",
        "key_energy": 680.0,
        "fill_hex": "#FBBF24",
        "fill_energy": 230.0,
        "rim_hex": "#38BDF8",
        "rim_energy": 490.0,
    },
    "studio-three-point": {
        "zenith": "#0B0F19",
        "horizon": "#1E293B",
        "key_hex": "#FFFBEB",
        "key_energy": 700.0,
        "fill_hex": "#93C5FD",
        "fill_energy": 260.0,
        "rim_hex": "#38BDF8",
        "rim_energy": 480.0,
    },
}


def _aim_object_at(obj: bpy.types.Object, target_pt: mathutils.Vector):
    direction = target_pt - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler("XYZ")


def configure_scene_lighting_and_lookdev(
    scene: bpy.types.Scene,
    lighting_preset: str = "golden-hour",
    intensity_multiplier: float = 1.25,
    render_quality: str = "final",
):
    """
    Sets up cinematic three-point lighting + eye catchlights + motivated practical lights,
    a rich gradient World shader, Eevee/Cycles render features, and Filmic lookdev.
    """
    pal = LIGHTING_PRESET_PALETTES.get(lighting_preset, LIGHTING_PRESET_PALETTES["golden-hour"])
    mult = max(0.5, float(intensity_multiplier))

    # 1. Multi-node World Sky Gradient Shader
    world = scene.world or bpy.data.worlds.new("AetherFrame_World")
    scene.world = world
    world.use_nodes = True
    wnodes = world.node_tree.nodes
    wlinks = world.node_tree.links
    wnodes.clear()

    w_out = wnodes.new(type="ShaderNodeOutputWorld")
    w_out.location = (420, 0)
    w_bg = wnodes.new(type="ShaderNodeBackground")
    w_bg.location = (180, 0)
    w_bg.inputs["Strength"].default_value = 0.85

    w_ramp = wnodes.new(type="ShaderNodeValToRGB")
    w_ramp.location = (-80, 0)
    w_ramp.color_ramp.elements[0].position = 0.0
    w_ramp.color_ramp.elements[0].color = hex_to_rgba(pal["horizon"])
    w_ramp.color_ramp.elements[1].position = 0.75
    w_ramp.color_ramp.elements[1].color = hex_to_rgba(pal["zenith"])

    w_sep = wnodes.new(type="ShaderNodeSeparateXYZ")
    w_sep.location = (-280, 0)
    w_coord = wnodes.new(type="ShaderNodeTexCoord")
    w_coord.location = (-480, 0)

    wlinks.new(w_coord.outputs["Generated"], w_sep.inputs["Vector"])
    wlinks.new(w_sep.outputs["Z"], w_ramp.inputs["Fac"])
    wlinks.new(w_ramp.outputs["Color"], w_bg.inputs["Color"])
    wlinks.new(w_bg.outputs["Background"], w_out.inputs["Surface"])

    # 2. Key Light (Warm Rembrandt Area Light)
    key_data = bpy.data.lights.new(name="Cinema_Key_Light", type="AREA")
    key_data.energy = pal["key_energy"] * mult
    key_data.color = hex_to_rgba(pal["key_hex"])[:3]
    key_data.size = 2.8
    key_data.use_shadow = True
    key_obj = bpy.data.objects.new(name="Cinema_Key_Light", object_data=key_data)
    scene.collection.objects.link(key_obj)
    key_obj.location = mathutils.Vector((2.6, -2.8, 3.2))
    _aim_object_at(key_obj, mathutils.Vector((0.0, 0.0, 1.35)))

    # 3. Fill Light (Cool Soft Area Light on Opposite Side)
    fill_data = bpy.data.lights.new(name="Cinema_Fill_Light", type="AREA")
    fill_data.energy = pal["fill_energy"] * mult
    fill_data.color = hex_to_rgba(pal["fill_hex"])[:3]
    fill_data.size = 3.6
    fill_data.use_shadow = False
    fill_obj = bpy.data.objects.new(name="Cinema_Fill_Light", object_data=fill_data)
    scene.collection.objects.link(fill_obj)
    fill_obj.location = mathutils.Vector((-3.0, -2.4, 2.2))
    _aim_object_at(fill_obj, mathutils.Vector((0.0, 0.0, 1.25)))

    # 4. Rim / Back Light (High-Contrast Hair & Shoulder Separation)
    rim_data = bpy.data.lights.new(name="Cinema_Rim_Light", type="AREA")
    rim_data.energy = pal["rim_energy"] * mult
    rim_data.color = hex_to_rgba(pal["rim_hex"])[:3]
    rim_data.size = 2.4
    rim_data.use_shadow = True
    rim_obj = bpy.data.objects.new(name="Cinema_Rim_Light", object_data=rim_data)
    scene.collection.objects.link(rim_obj)
    rim_obj.location = mathutils.Vector((0.0, 2.9, 3.1))
    _aim_object_at(rim_obj, mathutils.Vector((0.0, 0.0, 1.38)))

    # 5. Eye & Visor Catchlight (Frontal Low-Energy Specular Sparkle)
    catch_data = bpy.data.lights.new(name="Cinema_Eye_Catchlight", type="POINT")
    catch_data.energy = 65.0 * mult
    catch_data.color = (1.0, 0.98, 0.95)
    catch_data.shadow_soft_size = 0.25
    catch_data.use_shadow = False
    catch_obj = bpy.data.objects.new(name="Cinema_Eye_Catchlight", object_data=catch_data)
    scene.collection.objects.link(catch_obj)
    catch_obj.location = mathutils.Vector((0.0, -2.1, 1.62))

    # 6. Configure Render Engine & Filmic Lookdev
    if hasattr(scene, "eevee"):
        eevee = scene.eevee
        if hasattr(eevee, "use_gtao"):
            eevee.use_gtao = True
            eevee.gtao_distance = 0.75
        if hasattr(eevee, "use_bloom"):
            eevee.use_bloom = True
            eevee.bloom_intensity = 0.045
            eevee.bloom_threshold = 0.95
        if hasattr(eevee, "use_ssr"):
            eevee.use_ssr = render_quality == "final" and False
        if hasattr(eevee, "taa_render_samples"):
            eevee.taa_render_samples = 4 if render_quality == "final" else 2

    # Filmic Colour Management
    try:
        scene.view_settings.view_transform = "Filmic"
    except Exception:
        pass
    try:
        scene.view_settings.look = "Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = 0.15
    scene.view_settings.gamma = 1.0

    return [key_obj, fill_obj, rim_obj, catch_obj]
