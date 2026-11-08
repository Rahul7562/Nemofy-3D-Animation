import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CharacterConfig,
  CharacterJointPose,
  EnvironmentType,
  LightingPreset,
  StoryboardScene,
  VisualStyle,
  WeatherEffect,
} from "../utils/types";
import {
  computeCameraTransformAtFrame,
  computeCharacterPoseAtFrame,
  seededRandom,
} from "../utils/animation-math";
import { getStyleMaterialProps } from "../materials/style-materials";

export interface PaletteConfig {
  skyBg: string;
  keyColor: string;
  fillSky: string;
  fillGround: string;
  rimColor: string;
  particleColor: string;
}

export const SHARED_LIGHTING_PALETTES: Record<LightingPreset, PaletteConfig> = {
  "golden-hour": {
    skyBg: "#0f172a",
    keyColor: "#fbbf24",
    fillSky: "#38bdf8",
    fillGround: "#1e1b4b",
    rimColor: "#f97316",
    particleColor: "#fde68a",
  },
  "moonlit-cobalt": {
    skyBg: "#020617",
    keyColor: "#60a5fa",
    fillSky: "#1d4ed8",
    fillGround: "#090d16",
    rimColor: "#22d3ee",
    particleColor: "#bae6fd",
  },
  "studio-three-point": {
    skyBg: "#0b0f19",
    keyColor: "#fffbeb",
    fillSky: "#93c5fd",
    fillGround: "#1e293b",
    rimColor: "#38bdf8",
    particleColor: "#e2e8f0",
  },
  "sunset-dramatic": {
    skyBg: "#1c1018",
    keyColor: "#fb7185",
    fillSky: "#f59e0b",
    fillGround: "#1f122b",
    rimColor: "#fbbf24",
    particleColor: "#fed7aa",
  },
  "emerald-mist": {
    skyBg: "#041f1e",
    keyColor: "#6ee7b7",
    fillSky: "#2dd4bf",
    fillGround: "#022c22",
    rimColor: "#34d399",
    particleColor: "#a7f3d0",
  },
};

const gltfCache = new Map<string, GLTF>();

export async function preloadProjectGltfCharacters(
  characters: CharacterConfig[],
): Promise<void> {
  const loader = new GLTFLoader();
  for (const char of characters) {
    if (char.glbUrl && !gltfCache.has(char.glbUrl)) {
      try {
        const gltf = await new Promise<GLTF>((resolve, reject) => {
          loader.load(char.glbUrl!, resolve, undefined, reject);
        });
        gltfCache.set(char.glbUrl, gltf);
      } catch {
        // Fallback to procedural rig if GLB fails to load
      }
    }
  }
}

export function buildSharedLightingAndAtmosphere(
  threeScene: THREE.Scene,
  preset: LightingPreset,
  intensityMultiplier: number,
  fogDensity: number,
  weatherEffect: WeatherEffect,
  localFrame: number,
  fps: number,
  enableShadows: boolean,
): THREE.Group {
  const palette =
    SHARED_LIGHTING_PALETTES[preset] ?? SHARED_LIGHTING_PALETTES["golden-hour"];
  threeScene.background = new THREE.Color(palette.skyBg);
  threeScene.fog = new THREE.FogExp2(palette.skyBg, fogDensity);

  const group = new THREE.Group();

  const hemi = new THREE.HemisphereLight(
    palette.fillSky,
    palette.fillGround,
    0.95 * intensityMultiplier,
  );
  group.add(hemi);

  const dirLight = new THREE.DirectionalLight(
    palette.keyColor,
    2.2 * intensityMultiplier,
  );
  dirLight.position.set(6.5, 9.5, 5.5);
  dirLight.castShadow = enableShadows;
  if (enableShadows) {
    dirLight.shadow.mapSize.width = 512;
    dirLight.shadow.mapSize.height = 512;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 28;
    dirLight.shadow.bias = -0.0005;
  }
  group.add(dirLight);

  const rimLight = new THREE.PointLight(
    palette.rimColor,
    18 * intensityMultiplier,
    22,
  );
  rimLight.position.set(-4.5, 4.2, -5.0);
  group.add(rimLight);

  if (weatherEffect !== "none") {
    const timeSec = localFrame / Math.max(1, fps);
    const count = weatherEffect === "rain" ? 40 : 28;
    const particleGeo = new THREE.DodecahedronGeometry(1, 0);

    for (let i = 0; i < count; i++) {
      const baseX = (seededRandom(`px-${weatherEffect}-${i}`) - 0.5) * 14;
      const baseY = 0.4 + seededRandom(`py-${weatherEffect}-${i}`) * 5.2;
      const baseZ = (seededRandom(`pz-${weatherEffect}-${i}`) - 0.5) * 12;
      const speed = 0.35 + seededRandom(`ps-${weatherEffect}-${i}`) * 0.9;
      const phase = seededRandom(`pp-${weatherEffect}-${i}`) * Math.PI * 2;
      const scale = 0.03 + seededRandom(`psc-${weatherEffect}-${i}`) * 0.045;

      let x = baseX;
      let y = baseY;
      const z = baseZ;

      if (weatherEffect === "rain") {
        y = (((baseY - timeSec * speed * 6.5) % 5.5) + 5.5) % 5.5;
      } else if (weatherEffect === "snow") {
        y = (((baseY - timeSec * speed * 1.4) % 5.5) + 5.5) % 5.5;
        x = baseX + Math.sin(timeSec * 1.5 + phase) * 0.35;
      } else {
        x = baseX + Math.sin(timeSec * speed + phase) * 0.45;
        y = baseY + Math.cos(timeSec * speed * 0.8 + phase) * 0.35;
      }

      const mat = new THREE.MeshBasicMaterial({
        color: palette.particleColor,
        transparent: true,
        opacity:
          weatherEffect === "fireflies"
            ? 0.45 + Math.sin(timeSec * 4 + phase) * 0.45
            : 0.65,
      });

      const pMesh = new THREE.Mesh(particleGeo, mat);
      pMesh.position.set(x, y, z);
      if (weatherEffect === "rain") {
        pMesh.scale.set(0.015, 0.22, 0.015);
      } else {
        pMesh.scale.set(scale, scale, scale);
      }
      group.add(pMesh);
    }
  }

  return group;
}

export function buildSharedEnvironment3D(
  environment: EnvironmentType,
  visualStyle: VisualStyle,
  localFrame: number,
  fps: number,
): THREE.Group {
  const timeSec = localFrame / Math.max(1, fps);
  const isVoxel = visualStyle === "voxel";
  const segs =
    visualStyle === "low-poly" || visualStyle === "isometric"
      ? 6
      : isVoxel
        ? 4
        : 16;

  const stoneMat = getStyleMaterialProps(visualStyle, 0.78, 0.12);
  const metalMat = getStyleMaterialProps(visualStyle, 0.28, 0.65);
  const foliageMat = getStyleMaterialProps(visualStyle, 0.72, 0.05);

  const perimeterPeaks: {
    x: number;
    z: number;
    radius: number;
    height: number;
    rotY: number;
  }[] = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 20 + seededRandom(`peak-d-${i}`) * 8;
    const radius = 3.5 + seededRandom(`peak-r-${i}`) * 3.8;
    const height = 5.5 + seededRandom(`peak-h-${i}`) * 7.5;
    perimeterPeaks.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      radius,
      height,
      rotY: seededRandom(`peak-rot-${i}`) * Math.PI,
    });
  }

  const root = new THREE.Group();

  if (environment === "observatory-citadel") {
    const ringRot1 = timeSec * 0.45;
    const ringRot2 = -timeSec * 0.62;
    const ringRot3 = timeSec * 0.3;

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(36, 24),
      new THREE.MeshStandardMaterial({
        color: "#1e293b",
        roughness: stoneMat.roughness,
        metalness: stoneMat.metalness,
        flatShading: stoneMat.flatShading,
      }),
    );
    floor.position.set(0, -0.15, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.4, 0.12, segs * 2),
      new THREE.MeshStandardMaterial({
        color: "#334155",
        roughness: stoneMat.roughness,
        metalness: stoneMat.metalness,
        flatShading: stoneMat.flatShading,
      }),
    );
    platform.position.set(0, -0.06, 0);
    platform.receiveShadow = true;
    root.add(platform);

    const brassInlay = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.65, segs * 2),
      new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        roughness: 0.28,
        metalness: 0.65,
      }),
    );
    brassInlay.position.set(0, 0.01, 0);
    brassInlay.rotation.set(-Math.PI / 2, 0, ringRot3 * 0.2);
    root.add(brassInlay);

    const armillaryGroup = new THREE.Group();
    armillaryGroup.position.set(0, 0, -2.6);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.45, 0.8, segs),
      new THREE.MeshStandardMaterial({
        color: "#475569",
        roughness: stoneMat.roughness,
        metalness: 0.2,
        flatShading: stoneMat.flatShading,
      }),
    );
    pedestal.position.set(0, 0.4, 0);
    pedestal.castShadow = true;
    armillaryGroup.add(pedestal);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.42, 1.1, segs),
      new THREE.MeshStandardMaterial({
        color: "#d97706",
        roughness: metalMat.roughness,
        metalness: metalMat.metalness,
      }),
    );
    stem.position.set(0, 1.35, 0);
    armillaryGroup.add(stem);

    const ringsContainer = new THREE.Group();
    ringsContainer.position.set(0, 2.7, 0);
    ringsContainer.rotation.set(0.35, ringRot1, 0.15);

    const r1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.075, 8, segs * 2),
      new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        roughness: metalMat.roughness,
        metalness: metalMat.metalness,
      }),
    );
    ringsContainer.add(r1);

    const r2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.06, 8, segs * 2),
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        roughness: 0.25,
        metalness: 0.65,
      }),
    );
    r2.rotation.set(ringRot2, 0.6, 0);
    ringsContainer.add(r2);

    const r3 = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.045, 8, segs * 2),
      new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0284c7",
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.65,
      }),
    );
    r3.rotation.set(0.4, ringRot3, ringRot1);
    ringsContainer.add(r3);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: "#bae6fd",
        emissive: "#38bdf8",
        emissiveIntensity: 1.8,
        roughness: 0.1,
      }),
    );
    ringsContainer.add(core);
    armillaryGroup.add(ringsContainer);
    root.add(armillaryGroup);

    [-4.2, -2.4, 2.4, 4.2].forEach((colX, idx) => {
      const colGroup = new THREE.Group();
      colGroup.position.set(colX, 0, -3.4 + Math.abs(colX) * 0.25);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.4, 0.68),
        new THREE.MeshStandardMaterial({
          color: "#475569",
          roughness: stoneMat.roughness,
          flatShading: stoneMat.flatShading,
        }),
      );
      base.position.set(0, 0.2, 0);
      colGroup.add(base);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 2.7, segs),
        new THREE.MeshStandardMaterial({
          color: "#64748b",
          roughness: stoneMat.roughness,
          flatShading: stoneMat.flatShading,
        }),
      );
      pillar.position.set(0, 1.75, 0);
      colGroup.add(pillar);

      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({
          color: "#fde047",
          emissive: "#f59e0b",
          emissiveIntensity: 1.2 + (idx % 2) * 0.3,
        }),
      );
      crystal.position.set(0, 3.25, 0);
      colGroup.add(crystal);

      root.add(colGroup);
    });

    perimeterPeaks.forEach((p) => {
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(p.radius, p.height, 6),
        new THREE.MeshStandardMaterial({
          color: "#1e293b",
          roughness: 0.9,
          flatShading: true,
        }),
      );
      peak.position.set(p.x, p.height * 0.42, p.z);
      peak.rotation.y = p.rotY;
      root.add(peak);
    });

    return root;
  }

  if (environment === "bioluminescent-forest") {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(36, 24),
      new THREE.MeshStandardMaterial({
        color: "#064e3b",
        roughness: foliageMat.roughness,
        flatShading: foliageMat.flatShading,
      }),
    );
    floor.position.set(0, -0.12, 0);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);

    [-1.5, -0.3, 0.9, 2.0].forEach((zPos, i) => {
      const stepStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.72, 0.06, 7),
        new THREE.MeshStandardMaterial({
          color: "#334155",
          roughness: 0.85,
          flatShading: true,
        }),
      );
      stepStone.position.set(Math.sin(i * 1.2) * 0.45, 0.02, zPos);
      root.add(stepStone);
    });

    const trees = [
      { x: -3.8, z: -2.5, s: 1.15, tint: "#10b981" },
      { x: 3.6, z: -2.8, s: 1.25, tint: "#059669" },
      { x: -5.2, z: 0.8, s: 0.95, tint: "#34d399" },
      { x: 4.8, z: 1.1, s: 1.05, tint: "#0d9488" },
      { x: -2.0, z: -4.8, s: 1.35, tint: "#047857" },
      { x: 2.1, z: -5.1, s: 1.2, tint: "#14b8a6" },
    ];

    trees.forEach((t) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(t.x, 0, t.z);
      tGroup.scale.setScalar(t.s);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 1.8, 7),
        new THREE.MeshStandardMaterial({
          color: "#5c2808",
          roughness: 0.85,
          flatShading: foliageMat.flatShading,
        }),
      );
      trunk.position.set(0, 0.9, 0);
      tGroup.add(trunk);

      const c1 = new THREE.Mesh(
        new THREE.ConeGeometry(1.35, 1.3, segs),
        new THREE.MeshStandardMaterial({
          color: t.tint,
          roughness: foliageMat.roughness,
          flatShading: foliageMat.flatShading,
        }),
      );
      c1.position.set(0, 2.1, 0);
      tGroup.add(c1);

      const c2 = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 1.15, segs),
        new THREE.MeshStandardMaterial({
          color: t.tint,
          roughness: foliageMat.roughness,
          flatShading: foliageMat.flatShading,
        }),
      );
      c2.position.set(0, 2.85, 0);
      tGroup.add(c2);

      const c3 = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 0.95, segs),
        new THREE.MeshStandardMaterial({
          color: "#6ee7b7",
          roughness: foliageMat.roughness,
          flatShading: foliageMat.flatShading,
        }),
      );
      c3.position.set(0, 3.5, 0);
      tGroup.add(c3);

      root.add(tGroup);
    });

    [
      { x: -2.2, z: -1.1, c: "#22d3ee" },
      { x: 2.3, z: -0.9, c: "#a855f7" },
      { x: 0.2, z: -2.8, c: "#34d399" },
    ].forEach((cr, idx) => {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.36, 0),
        new THREE.MeshStandardMaterial({
          color: cr.c,
          emissive: cr.c,
          emissiveIntensity: 1.1 + Math.sin(timeSec * 2.5 + idx) * 0.35,
          roughness: 0.15,
          metalness: 0.5,
        }),
      );
      crystal.position.set(cr.x, 0.45, cr.z);
      crystal.rotation.set(0.12, idx * 0.8, -0.1);
      root.add(crystal);
    });

    return root;
  }

  if (environment === "cyber-harbor") {
    const hoverBob = Math.sin(timeSec * 2.2) * 0.12;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: "#082f49",
        roughness: 0.25,
        metalness: 0.6,
      }),
    );
    water.position.set(0, -0.25, 0);
    water.rotation.x = -Math.PI / 2;
    root.add(water);

    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.16, 6.8),
      new THREE.MeshStandardMaterial({
        color: "#1e293b",
        roughness: stoneMat.roughness,
        metalness: 0.25,
      }),
    );
    dock.position.set(0, -0.08, 0.6);
    root.add(dock);

    const craft = new THREE.Group();
    craft.position.set(0, 0.55 + hoverBob, -3.8);
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.55, 1.8),
      new THREE.MeshStandardMaterial({
        color: "#334155",
        roughness: 0.4,
        metalness: 0.55,
      }),
    );
    craft.add(hull);
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.38, 1.2),
      new THREE.MeshStandardMaterial({
        color: "#0ea5e9",
        roughness: 0.2,
        metalness: 0.6,
      }),
    );
    canopy.position.set(-0.8, 0.42, 0);
    craft.add(canopy);
    root.add(craft);

    [-4.2, 4.2].forEach((bx, i) => {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 3.2, 0.55),
        new THREE.MeshStandardMaterial({
          color: "#0f172a",
          roughness: 0.35,
          metalness: 0.6,
        }),
      );
      pylon.position.set(bx, 1.6, -2.0);
      root.add(pylon);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.7, 0.04),
        new THREE.MeshStandardMaterial({
          color: i === 0 ? "#f43f5e" : "#22d3ee",
          emissive: i === 0 ? "#f43f5e" : "#22d3ee",
          emissiveIntensity: 1.6,
        }),
      );
      sign.position.set(bx, 2.8, -1.71);
      root.add(sign);
    });

    return root;
  }

  if (environment === "desert-monolith") {
    const glyphRot = timeSec * 0.5;
    const sand = new THREE.Mesh(
      new THREE.CircleGeometry(38, 24),
      new THREE.MeshStandardMaterial({
        color: "#b45309",
        roughness: 0.86,
        metalness: 0.05,
        flatShading: stoneMat.flatShading,
      }),
    );
    sand.position.set(0, -0.1, 0);
    sand.rotation.x = -Math.PI / 2;
    root.add(sand);

    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 5.2, 0.14, 8),
      new THREE.MeshStandardMaterial({
        color: "#78350f",
        roughness: 0.8,
        flatShading: stoneMat.flatShading,
      }),
    );
    dais.position.set(0, -0.03, 0);
    root.add(dais);

    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.78, 3.7, 4),
      new THREE.MeshStandardMaterial({
        color: "#292524",
        roughness: 0.35,
        metalness: 0.55,
        flatShading: true,
      }),
    );
    obelisk.position.set(0, 1.85, -2.5);
    root.add(obelisk);

    const solarRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#d97706",
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.65,
      }),
    );
    solarRing.position.set(0, 2.5, -2.5);
    solarRing.rotation.set(Math.PI / 3, glyphRot, 0);
    root.add(solarRing);

    return root;
  }

  if (environment === "floating-sanctuary") {
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 6.2, 0.4, segs * 2),
      new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        roughness: 0.6,
        metalness: 0.15,
        flatShading: stoneMat.flatShading,
      }),
    );
    deck.position.set(0, -0.2, 0);
    root.add(deck);

    const underCone = new THREE.Mesh(
      new THREE.ConeGeometry(6.1, 4.4, segs),
      new THREE.MeshStandardMaterial({
        color: "#475569",
        roughness: 0.85,
        flatShading: true,
      }),
    );
    underCone.position.set(0, -2.6, 0);
    underCone.rotation.x = Math.PI;
    root.add(underCone);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.18, 8, segs * 2, Math.PI),
      new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        roughness: 0.3,
        metalness: 0.5,
      }),
    );
    arch.position.set(0, 2.1, -2.8);
    root.add(arch);

    const portal = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 24),
      new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0284c7",
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.45,
      }),
    );
    portal.position.set(0, 1.1, -2.8);
    root.add(portal);

    return root;
  }

  // minimal-studio
  const cyc = new THREE.Mesh(
    new THREE.CircleGeometry(24, 32),
    new THREE.MeshStandardMaterial({
      color: "#1e293b",
      roughness: 0.5,
      metalness: 0.2,
    }),
  );
  cyc.position.set(0, -0.05, 0);
  cyc.rotation.x = -Math.PI / 2;
  root.add(cyc);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.95, 3.02, 32),
    new THREE.MeshStandardMaterial({
      color: "#38bdf8",
      emissive: "#38bdf8",
      emissiveIntensity: 0.5,
    }),
  );
  ring.position.set(0, 0.01, 0);
  ring.rotation.x = -Math.PI / 2;
  root.add(ring);

  return root;
}

export function buildSharedCharacterActor3D(
  config: CharacterConfig,
  pose: CharacterJointPose,
  visualStyle: VisualStyle,
  localFrame: number,
  fps: number,
): THREE.Group {
  const actorRoot = new THREE.Group();
  actorRoot.position.set(...pose.worldPosition);
  actorRoot.rotation.set(0, pose.worldRotationY, 0);

  // Contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.42 * config.scale, 16),
    new THREE.MeshBasicMaterial({
      color: "#020617",
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  shadowDisc.position.set(0, 0.015, 0);
  shadowDisc.rotation.x = -Math.PI / 2;
  actorRoot.add(shadowDisc);

  // Check if a GLB model is cached for this character
  if (config.glbUrl && gltfCache.has(config.glbUrl)) {
    const cached = gltfCache.get(config.glbUrl)!;
    const cloned = cached.scene.clone(true);
    cloned.scale.setScalar(config.scale);
    cloned.position.set(0, pose.hipBobY, 0);

    if (cached.animations && cached.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(cloned);
      const action = mixer.clipAction(cached.animations[0]);
      action.play();
      mixer.setTime(localFrame / Math.max(1, fps));
    }

    cloned.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        const boneName = child.name.toLowerCase();
        if (boneName.includes("head") || boneName.includes("neck")) {
          child.rotation.y = pose.headYawY;
          child.rotation.x = pose.headPitchX;
        } else if (boneName.includes("jaw") || boneName.includes("mouth")) {
          child.rotation.x = pose.mouthOpenness * 0.45;
        }
      }
    });

    actorRoot.add(cloned);
    return actorRoot;
  }

  const isVoxel = visualStyle === "voxel";
  const segs =
    visualStyle === "low-poly" || visualStyle === "isometric"
      ? 6
      : isVoxel
        ? 4
        : 14;

  const primaryMat = getStyleMaterialProps(
    visualStyle,
    config.roughness,
    config.metalness,
  );
  const secondaryMat = getStyleMaterialProps(
    visualStyle,
    Math.max(0.2, config.roughness - 0.2),
    Math.min(0.65, config.metalness + 0.15),
  );
  const skinMat = getStyleMaterialProps(visualStyle, 0.65, 0.08);

  const eyeScaleY = Math.max(0.08, 1 - pose.eyeBlink * 0.92);
  const mouthOpenHeight = 0.022 + pose.mouthOpenness * 0.105;
  const mouthActualWidth = 0.085 + pose.mouthWidth * 0.085;

  if (config.archetype === "avian-drone") {
    const droneGroup = new THREE.Group();
    droneGroup.scale.setScalar(config.scale);
    droneGroup.position.set(0, 0.15 + pose.hipBobY, 0);
    droneGroup.rotation.set(pose.torsoLeanX, pose.torsoTwistY, 0);

    const chassis = new THREE.Mesh(
      isVoxel
        ? new THREE.BoxGeometry(0.48, 0.42, 0.52)
        : new THREE.DodecahedronGeometry(0.28, segs > 8 ? 1 : 0),
      new THREE.MeshStandardMaterial({
        color: config.primaryColor,
        roughness: primaryMat.roughness,
        metalness: primaryMat.metalness,
        flatShading: primaryMat.flatShading,
      }),
    );
    droneGroup.add(chassis);

    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 10),
      new THREE.MeshStandardMaterial({
        color: config.accentColor,
        emissive: config.accentColor,
        emissiveIntensity: 1.6,
      }),
    );
    lens.position.set(0, 0.08, 0.29);
    lens.scale.set(1, eyeScaleY, 1);
    droneGroup.add(lens);

    const wingFlap = Math.sin(pose.hipBobY * 45) * 0.55;
    const leftWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.05, 0.26),
      new THREE.MeshStandardMaterial({
        color: config.secondaryColor,
        roughness: secondaryMat.roughness,
        metalness: secondaryMat.metalness,
      }),
    );
    leftWing.position.set(-0.42, 0.05, 0);
    leftWing.rotation.z = 0.25 + wingFlap;
    droneGroup.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.set(0.42, 0.05, 0);
    rightWing.rotation.z = -0.25 - wingFlap;
    droneGroup.add(rightWing);

    actorRoot.add(droneGroup);
    return actorRoot;
  }

  // Humanoid / Scholar / Explorer / Guardian Rig
  const rigRoot = new THREE.Group();
  rigRoot.scale.setScalar(config.scale);

  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.72 + pose.hipBobY, 0);

  const pelvisMesh = new THREE.Mesh(
    isVoxel
      ? new THREE.BoxGeometry(0.44, 0.16, 0.28)
      : new THREE.CylinderGeometry(0.21, 0.19, 0.16, segs),
    new THREE.MeshStandardMaterial({
      color: config.secondaryColor,
      roughness: secondaryMat.roughness,
      metalness: secondaryMat.metalness,
      flatShading: secondaryMat.flatShading,
    }),
  );
  pelvisGroup.add(pelvisMesh);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.08, 0);
  torsoGroup.rotation.set(pose.torsoLeanX, pose.torsoTwistY, 0);

  const torsoMesh = new THREE.Mesh(
    isVoxel
      ? new THREE.BoxGeometry(0.5, 0.54, 0.3)
      : new THREE.CylinderGeometry(0.25, 0.21, 0.52, segs),
    new THREE.MeshStandardMaterial({
      color: config.primaryColor,
      roughness: primaryMat.roughness,
      metalness: primaryMat.metalness,
      flatShading: primaryMat.flatShading,
    }),
  );
  torsoMesh.position.set(0, 0.26, 0);
  torsoGroup.add(torsoMesh);

  if (config.archetype === "scholar-humanoid") {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.042, 8, segs),
      new THREE.MeshStandardMaterial({
        color: config.secondaryColor,
        roughness: 0.45,
        metalness: 0.2,
      }),
    );
    collar.position.set(0, 0.49, 0.02);
    collar.rotation.x = Math.PI / 2;
    torsoGroup.add(collar);
  }

  const chestCore = new THREE.Mesh(
    config.archetype === "guardian-bot"
      ? new THREE.OctahedronGeometry(0.09, 0)
      : new THREE.DodecahedronGeometry(0.065, 0),
    new THREE.MeshStandardMaterial({
      color: config.accentColor,
      emissive: config.accentColor,
      emissiveIntensity: config.archetype === "guardian-bot" ? 1.2 : 0.65,
    }),
  );
  chestCore.position.set(0, 0.32, 0.17);
  torsoGroup.add(chestCore);

  // Head & Face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.58, 0);
  headGroup.rotation.set(pose.headPitchX, pose.headYawY, 0);

  const headMesh = new THREE.Mesh(
    isVoxel
      ? new THREE.BoxGeometry(0.36, 0.36, 0.36)
      : config.archetype === "guardian-bot"
        ? new THREE.CylinderGeometry(0.17, 0.19, 0.32, 8)
        : new THREE.SphereGeometry(0.2, segs, segs),
    new THREE.MeshStandardMaterial({
      color: config.skinOrChassisColor,
      roughness: skinMat.roughness,
      metalness: config.archetype === "guardian-bot" ? 0.55 : skinMat.metalness,
      flatShading: skinMat.flatShading,
    }),
  );
  headMesh.position.set(0, 0.22, 0);
  headGroup.add(headMesh);

  const capMesh = new THREE.Mesh(
    config.archetype === "scholar-humanoid"
      ? new THREE.CylinderGeometry(0.19, 0.21, 0.09, segs)
      : new THREE.ConeGeometry(0.22, 0.22, segs),
    new THREE.MeshStandardMaterial({
      color: config.primaryColor,
      roughness: primaryMat.roughness,
      metalness: primaryMat.metalness,
      flatShading: primaryMat.flatShading,
    }),
  );
  capMesh.position.set(0, 0.34, -0.01);
  headGroup.add(capMesh);

  const eyeMat = new THREE.MeshStandardMaterial({
    color:
      config.archetype === "guardian-bot" ? config.accentColor : "#0f172a",
    emissive:
      config.archetype === "guardian-bot" ? config.accentColor : "#000000",
    emissiveIntensity: config.archetype === "guardian-bot" ? 1.5 : 0,
  });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), eyeMat);
  leftEye.position.set(-0.07, 0.24, 0.175);
  leftEye.scale.set(1, eyeScaleY, 1);
  headGroup.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.set(0.07, 0.24, 0.175);
  headGroup.add(rightEye);

  const mouthMesh = new THREE.Mesh(
    new THREE.BoxGeometry(mouthActualWidth, mouthOpenHeight, 0.032),
    new THREE.MeshStandardMaterial({
      color:
        config.archetype === "guardian-bot" ? config.accentColor : "#7f1d1d",
      emissive:
        config.archetype === "guardian-bot" && pose.mouthOpenness > 0.08
          ? config.accentColor
          : pose.mouthOpenness > 0.2
            ? "#f43f5e"
            : "#000000",
      emissiveIntensity: config.archetype === "guardian-bot" ? 1.3 : 0.35,
    }),
  );
  mouthMesh.position.set(0, 0.14 - pose.mouthOpenness * 0.022, 0.182);
  headGroup.add(mouthMesh);

  torsoGroup.add(headGroup);

  // Arms
  const buildArm = (isLeft: boolean) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(isLeft ? -0.3 : 0.3, 0.45, 0);
    armGroup.rotation.set(
      isLeft ? pose.leftUpperArmX : pose.rightUpperArmX,
      0,
      isLeft ? pose.leftUpperArmZ : pose.rightUpperArmZ,
    );
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.05, 0.26, segs),
      new THREE.MeshStandardMaterial({
        color: config.primaryColor,
        roughness: primaryMat.roughness,
        metalness: primaryMat.metalness,
      }),
    );
    upper.position.set(0, -0.14, 0);
    armGroup.add(upper);

    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.27, 0);
    forearmGroup.rotation.set(
      isLeft ? pose.leftForearmX : pose.rightForearmX,
      0,
      0,
    );
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.24, segs),
      new THREE.MeshStandardMaterial({
        color: config.skinOrChassisColor,
        roughness: skinMat.roughness,
      }),
    );
    lower.position.set(0, -0.12, 0);
    forearmGroup.add(lower);
    armGroup.add(forearmGroup);
    return armGroup;
  };

  torsoGroup.add(buildArm(true));
  torsoGroup.add(buildArm(false));
  pelvisGroup.add(torsoGroup);

  // Legs
  const buildLeg = (isLeft: boolean) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(isLeft ? -0.12 : 0.12, -0.04, 0);
    legGroup.rotation.set(isLeft ? pose.leftThighX : pose.rightThighX, 0, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.062, 0.34, segs),
      new THREE.MeshStandardMaterial({
        color: config.secondaryColor,
        roughness: secondaryMat.roughness,
      }),
    );
    thigh.position.set(0, -0.17, 0);
    legGroup.add(thigh);

    const shinGroup = new THREE.Group();
    shinGroup.position.set(0, -0.34, 0);
    shinGroup.rotation.set(isLeft ? pose.leftShinX : pose.rightShinX, 0, 0);
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.052, 0.32, segs),
      new THREE.MeshStandardMaterial({
        color: config.primaryColor,
        roughness: primaryMat.roughness,
      }),
    );
    shin.position.set(0, -0.16, 0);
    shinGroup.add(shin);
    legGroup.add(shinGroup);
    return legGroup;
  };

  pelvisGroup.add(buildLeg(true));
  pelvisGroup.add(buildLeg(false));

  rigRoot.add(pelvisGroup);
  actorRoot.add(rigRoot);
  return actorRoot;
}

export function populateSharedStageScene3D(
  threeScene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  sceneConfig: StoryboardScene,
  characters: CharacterConfig[],
  projectVisualStyle: VisualStyle,
  localFrame: number,
  durationInFrames: number,
  fps: number,
  enableShadows = false,
): void {
  const activeStyle = sceneConfig.visualStyleOverride ?? projectVisualStyle;

  // 1. Lighting & Atmosphere
  const lightingGroup = buildSharedLightingAndAtmosphere(
    threeScene,
    sceneConfig.lightingPreset,
    sceneConfig.lightIntensity,
    sceneConfig.fogDensity,
    sceneConfig.weatherEffect,
    localFrame,
    fps,
    enableShadows,
  );
  threeScene.add(lightingGroup);

  // 2. Camera Rig
  const camTransform = computeCameraTransformAtFrame(
    sceneConfig,
    localFrame,
    durationInFrames,
    fps,
  );
  camera.position.set(...camTransform.position);
  camera.fov =
    activeStyle === "isometric" ? 24 : camTransform.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(...camTransform.target);

  // 3. Environment
  const envGroup = buildSharedEnvironment3D(
    sceneConfig.environment,
    activeStyle,
    localFrame,
    fps,
  );
  threeScene.add(envGroup);

  // 4. Characters
  sceneConfig.characters.forEach((placement) => {
    const charConfig =
      characters.find((c) => c.id === placement.characterId) ?? characters[0];
    if (!charConfig) return;

    const pose = computeCharacterPoseAtFrame(
      placement,
      localFrame,
      durationInFrames,
      fps,
      `${charConfig.id}-${placement.action}`,
      sceneConfig.dialogueLipSync ?? null,
    );

    const charGroup = buildSharedCharacterActor3D(
      charConfig,
      pose,
      activeStyle,
      localFrame,
      fps,
    );
    threeScene.add(charGroup);
  });
}
