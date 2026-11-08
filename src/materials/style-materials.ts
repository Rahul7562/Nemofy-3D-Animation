import * as THREE from "three";
import { VisualStyle } from "../utils/types";
import { seededRandom } from "../utils/animation-math";

let cachedIsSoftwareGl: boolean | null = null;

export function detectIsSoftwareGl(): boolean {
  if (cachedIsSoftwareGl !== null) return cachedIsSoftwareGl;
  if (typeof document === "undefined") {
    cachedIsSoftwareGl = true;
    return true;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      cachedIsSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    cachedIsSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedIsSoftwareGl;
  } catch {
    cachedIsSoftwareGl = true;
    return true;
  }
}

const bumpTextureCache = new Map<string, THREE.CanvasTexture>();

export function getProceduralBumpTexture(
  style: VisualStyle,
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (style !== "claymation" && style !== "realistic" && style !== "voxel") {
    return null;
  }

  const cached = bumpTextureCache.get(style);
  if (cached) return cached;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);

  if (style === "claymation") {
    for (let i = 0; i < 40; i++) {
      const r1 = seededRandom(`clay-x-${i}`);
      const r2 = seededRandom(`clay-y-${i}`);
      const r3 = seededRandom(`clay-rad-${i}`);
      const x = r1 * size;
      const y = r2 * size;
      const rad = 4 + r3 * 10;
      ctx.strokeStyle =
        i % 2 === 0 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 1.3);
      ctx.stroke();
    }
  } else if (style === "realistic") {
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const v = Math.floor(105 + seededRandom(`real-${x}-${y}`) * 50);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  } else if (style === "voxel") {
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  bumpTextureCache.set(style, tex);
  return tex;
}

export interface StyleMaterialProps {
  roughness: number;
  metalness: number;
  flatShading: boolean;
  bumpScale: number;
  bumpMap: THREE.CanvasTexture | null;
  clearcoat: number;
  wireframe: boolean;
}

export function getStyleMaterialProps(
  style: VisualStyle,
  baseRoughness = 0.55,
  baseMetalness = 0.15,
): StyleMaterialProps {
  const bumpMap = getProceduralBumpTexture(style);

  switch (style) {
    case "low-poly":
      return {
        roughness: Math.min(0.85, baseRoughness + 0.1),
        metalness: Math.min(0.45, baseMetalness),
        flatShading: true,
        bumpScale: 0,
        bumpMap: null,
        clearcoat: 0,
        wireframe: false,
      };
    case "voxel":
      return {
        roughness: 0.65,
        metalness: 0.1,
        flatShading: true,
        bumpScale: 0.015,
        bumpMap,
        clearcoat: 0,
        wireframe: false,
      };
    case "claymation":
      return {
        roughness: 0.88,
        metalness: 0.02,
        flatShading: false,
        bumpScale: 0.035,
        bumpMap,
        clearcoat: 0.08,
        wireframe: false,
      };
    case "pixar":
      return {
        roughness: Math.max(0.25, baseRoughness * 0.65),
        metalness: Math.min(0.4, baseMetalness * 0.8),
        flatShading: false,
        bumpScale: 0,
        bumpMap: null,
        clearcoat: 0.35,
        wireframe: false,
      };
    case "isometric":
      return {
        roughness: 0.5,
        metalness: 0.15,
        flatShading: true,
        bumpScale: 0,
        bumpMap: null,
        clearcoat: 0.1,
        wireframe: false,
      };
    case "realistic":
      return {
        roughness: baseRoughness,
        metalness: Math.min(0.65, baseMetalness + 0.15),
        flatShading: false,
        bumpScale: 0.02,
        bumpMap,
        clearcoat: 0.2,
        wireframe: false,
      };
    case "minimalist":
    default:
      return {
        roughness: 0.78,
        metalness: 0.05,
        flatShading: false,
        bumpScale: 0,
        bumpMap: null,
        clearcoat: 0,
        wireframe: false,
      };
  }
}
