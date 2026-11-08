import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { LightingPreset, WeatherEffect } from "../utils/types";
import { seededRandom } from "../utils/animation-math";
import { detectIsSoftwareGl } from "../materials/style-materials";

interface LightingAndAtmosphereProps {
  preset: LightingPreset;
  intensityMultiplier: number;
  fogDensity: number;
  weatherEffect: WeatherEffect;
  localFrame: number;
  fps: number;
}

interface PaletteConfig {
  skyBg: string;
  keyColor: string;
  fillSky: string;
  fillGround: string;
  rimColor: string;
  particleColor: string;
}

const LIGHTING_PALETTES: Record<LightingPreset, PaletteConfig> = {
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

export const LightingAndAtmosphere: React.FC<LightingAndAtmosphereProps> = ({
  preset,
  intensityMultiplier,
  fogDensity,
  weatherEffect,
  localFrame,
  fps,
}) => {
  const { gl, scene } = useThree();
  const isSoftwareGl = useMemo(() => detectIsSoftwareGl(), []);
  const palette = LIGHTING_PALETTES[preset] ?? LIGHTING_PALETTES["golden-hour"];

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = !isSoftwareGl;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, isSoftwareGl]);

  useEffect(() => {
    const bgCol = new THREE.Color(palette.skyBg);
    scene.background = bgCol;
    scene.fog = new THREE.FogExp2(palette.skyBg, fogDensity);
  }, [scene, palette.skyBg, fogDensity]);

  const particles = useMemo(() => {
    if (weatherEffect === "none") return [];
    const count = weatherEffect === "rain" ? 40 : 28;
    const list: {
      baseX: number;
      baseY: number;
      baseZ: number;
      speed: number;
      phase: number;
      scale: number;
    }[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        baseX: (seededRandom(`px-${weatherEffect}-${i}`) - 0.5) * 14,
        baseY: 0.4 + seededRandom(`py-${weatherEffect}-${i}`) * 5.2,
        baseZ: (seededRandom(`pz-${weatherEffect}-${i}`) - 0.5) * 12,
        speed: 0.35 + seededRandom(`ps-${weatherEffect}-${i}`) * 0.9,
        phase: seededRandom(`pp-${weatherEffect}-${i}`) * Math.PI * 2,
        scale: 0.03 + seededRandom(`psc-${weatherEffect}-${i}`) * 0.045,
      });
    }
    return list;
  }, [weatherEffect]);

  const timeSec = localFrame / Math.max(1, fps);

  return (
    <group>
      <hemisphereLight
        args={[
          palette.fillSky,
          palette.fillGround,
          0.95 * intensityMultiplier,
        ]}
      />

      <directionalLight
        position={[6.5, 9.5, 5.5]}
        intensity={2.2 * intensityMultiplier}
        color={palette.keyColor}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={0.5}
        shadow-camera-far={28}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />

      <pointLight
        position={[-4.5, 4.2, -5.0]}
        intensity={18 * intensityMultiplier}
        distance={22}
        color={palette.rimColor}
      />

      {weatherEffect !== "none" && (
        <group>
          {particles.map((p, idx) => {
            let x = p.baseX;
            let y = p.baseY;
            const z = p.baseZ;

            if (weatherEffect === "rain") {
              y = ((p.baseY - timeSec * p.speed * 6.5) % 5.5 + 5.5) % 5.5;
            } else if (weatherEffect === "snow") {
              y = ((p.baseY - timeSec * p.speed * 1.4) % 5.5 + 5.5) % 5.5;
              x = p.baseX + Math.sin(timeSec * 1.5 + p.phase) * 0.35;
            } else {
              x = p.baseX + Math.sin(timeSec * p.speed + p.phase) * 0.45;
              y = p.baseY + Math.cos(timeSec * p.speed * 0.8 + p.phase) * 0.35;
            }

            return (
              <mesh
                key={idx}
                position={[x, y, z]}
                scale={
                  weatherEffect === "rain"
                    ? [0.015, 0.22, 0.015]
                    : [p.scale, p.scale, p.scale]
                }
              >
                <dodecahedronGeometry args={[1, 0]} />
                <meshBasicMaterial
                  color={palette.particleColor}
                  transparent
                  opacity={
                    weatherEffect === "fireflies"
                      ? 0.45 + Math.sin(timeSec * 4 + p.phase) * 0.45
                      : 0.65
                  }
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};
