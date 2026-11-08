import React, { useMemo } from "react";
import { EnvironmentType, VisualStyle } from "../utils/types";
import { getStyleMaterialProps } from "../materials/style-materials";
import { seededRandom } from "../utils/animation-math";

interface ProceduralEnvironmentProps {
  environment: EnvironmentType;
  visualStyle: VisualStyle;
  localFrame: number;
  fps: number;
}

export const ProceduralEnvironments: React.FC<ProceduralEnvironmentProps> = ({
  environment,
  visualStyle,
  localFrame,
  fps,
}) => {
  const timeSec = localFrame / Math.max(1, fps);
  const isVoxel = visualStyle === "voxel";
  const segs =
    visualStyle === "low-poly" || visualStyle === "isometric"
      ? 6
      : isVoxel
        ? 4
        : 16;

  const stoneMat = useMemo(
    () => getStyleMaterialProps(visualStyle, 0.78, 0.12),
    [visualStyle],
  );
  const metalMat = useMemo(
    () => getStyleMaterialProps(visualStyle, 0.28, 0.65),
    [visualStyle],
  );
  const foliageMat = useMemo(
    () => getStyleMaterialProps(visualStyle, 0.72, 0.05),
    [visualStyle],
  );

  const perimeterPeaks = useMemo(() => {
    const list: {
      x: number;
      z: number;
      radius: number;
      height: number;
      rotY: number;
    }[] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 20 + seededRandom(`peak-d-${i}`) * 8;
      const radius = 3.5 + seededRandom(`peak-r-${i}`) * 3.8;
      const height = 5.5 + seededRandom(`peak-h-${i}`) * 7.5;
      list.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        radius,
        height,
        rotY: seededRandom(`peak-rot-${i}`) * Math.PI,
      });
    }
    return list;
  }, []);

  if (environment === "observatory-citadel") {
    const ringRot1 = timeSec * 0.45;
    const ringRot2 = -timeSec * 0.62;
    const ringRot3 = timeSec * 0.3;

    return (
      <group>
        <mesh
          position={[0, -0.15, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[36, 24]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={stoneMat.roughness}
            metalness={stoneMat.metalness}
            flatShading={stoneMat.flatShading}
          />
        </mesh>

        <mesh position={[0, -0.06, 0]} receiveShadow>
          <cylinderGeometry args={[6.8, 7.4, 0.12, segs * 2]} />
          <meshStandardMaterial
            color="#334155"
            roughness={stoneMat.roughness}
            metalness={stoneMat.metalness}
            flatShading={stoneMat.flatShading}
            bumpMap={stoneMat.bumpMap}
            bumpScale={stoneMat.bumpScale}
          />
        </mesh>

        <mesh
          position={[0, 0.01, 0]}
          rotation={[-Math.PI / 2, 0, ringRot3 * 0.2]}
        >
          <ringGeometry args={[3.4, 3.65, segs * 2]} />
          <meshStandardMaterial
            color="#f59e0b"
            roughness={0.28}
            metalness={0.65}
          />
        </mesh>

        <group position={[0, 0, -2.6]}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.1, 1.45, 0.8, segs]} />
            <meshStandardMaterial
              color="#475569"
              roughness={stoneMat.roughness}
              metalness={0.2}
              flatShading={stoneMat.flatShading}
            />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.42, 1.1, segs]} />
            <meshStandardMaterial
              color="#d97706"
              roughness={metalMat.roughness}
              metalness={metalMat.metalness}
            />
          </mesh>
          <group position={[0, 2.7, 0]} rotation={[0.35, ringRot1, 0.15]}>
            <mesh castShadow>
              <torusGeometry args={[1.55, 0.075, 8, segs * 2]} />
              <meshStandardMaterial
                color="#f59e0b"
                roughness={metalMat.roughness}
                metalness={metalMat.metalness}
              />
            </mesh>
            <mesh rotation={[ringRot2, 0.6, 0]} castShadow>
              <torusGeometry args={[1.18, 0.06, 8, segs * 2]} />
              <meshStandardMaterial
                color="#fbbf24"
                roughness={0.25}
                metalness={0.65}
              />
            </mesh>
            <mesh rotation={[0.4, ringRot3, ringRot1]} castShadow>
              <torusGeometry args={[0.82, 0.045, 8, segs * 2]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.6}
                roughness={0.2}
                metalness={0.65}
              />
            </mesh>
            <mesh>
              <octahedronGeometry args={[0.32, 0]} />
              <meshStandardMaterial
                color="#bae6fd"
                emissive="#38bdf8"
                emissiveIntensity={1.8}
                roughness={0.1}
              />
            </mesh>
          </group>
        </group>

        {[-4.2, -2.4, 2.4, 4.2].map((colX, idx) => (
          <group key={colX} position={[colX, 0, -3.4 + Math.abs(colX) * 0.25]}>
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.68, 0.4, 0.68]} />
              <meshStandardMaterial
                color="#475569"
                roughness={stoneMat.roughness}
                flatShading={stoneMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.26, 2.7, segs]} />
              <meshStandardMaterial
                color="#64748b"
                roughness={stoneMat.roughness}
                flatShading={stoneMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 3.25, 0]}>
              <octahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial
                color="#fde047"
                emissive="#f59e0b"
                emissiveIntensity={1.2 + (idx % 2) * 0.3}
              />
            </mesh>
          </group>
        ))}

        {perimeterPeaks.map((p, idx) => (
          <mesh
            key={idx}
            position={[p.x, p.height * 0.42, p.z]}
            rotation={[0, p.rotY, 0]}
          >
            <coneGeometry args={[p.radius, p.height, 6]} />
            <meshStandardMaterial
              color="#1e293b"
              roughness={0.9}
              flatShading
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (environment === "bioluminescent-forest") {
    const trees = [
      { x: -3.8, z: -2.5, s: 1.15, tint: "#10b981" },
      { x: 3.6, z: -2.8, s: 1.25, tint: "#059669" },
      { x: -5.2, z: 0.8, s: 0.95, tint: "#34d399" },
      { x: 4.8, z: 1.1, s: 1.05, tint: "#0d9488" },
      { x: -2.0, z: -4.8, s: 1.35, tint: "#047857" },
      { x: 2.1, z: -5.1, s: 1.2, tint: "#14b8a6" },
    ];

    return (
      <group>
        <mesh
          position={[0, -0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[36, 24]} />
          <meshStandardMaterial
            color="#064e3b"
            roughness={foliageMat.roughness}
            flatShading={foliageMat.flatShading}
          />
        </mesh>

        {[-1.5, -0.3, 0.9, 2.0].map((zPos, i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 1.2) * 0.45, 0.02, zPos]}
            receiveShadow
          >
            <cylinderGeometry args={[0.65, 0.72, 0.06, 7]} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.85}
              flatShading
            />
          </mesh>
        ))}

        {trees.map((t, idx) => (
          <group key={idx} position={[t.x, 0, t.z]} scale={t.s}>
            <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.26, 0.44, 0.5, 7]} />
              <meshStandardMaterial
                color="#451a03"
                roughness={0.88}
                flatShading={foliageMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.18, 0.26, 1.6, 7]} />
              <meshStandardMaterial
                color="#5c2808"
                roughness={0.85}
                flatShading={foliageMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 2.1, 0]} castShadow>
              <coneGeometry args={[1.35, 1.3, segs]} />
              <meshStandardMaterial
                color={t.tint}
                roughness={foliageMat.roughness}
                flatShading={foliageMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 2.85, 0]} castShadow>
              <coneGeometry args={[1.05, 1.15, segs]} />
              <meshStandardMaterial
                color={t.tint}
                roughness={foliageMat.roughness}
                flatShading={foliageMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 3.5, 0]} castShadow>
              <coneGeometry args={[0.7, 0.95, segs]} />
              <meshStandardMaterial
                color="#6ee7b7"
                roughness={foliageMat.roughness}
                flatShading={foliageMat.flatShading}
              />
            </mesh>
          </group>
        ))}

        {[
          { x: -2.2, z: -1.1, c: "#22d3ee" },
          { x: 2.3, z: -0.9, c: "#a855f7" },
          { x: 0.2, z: -2.8, c: "#34d399" },
        ].map((cr, idx) => (
          <group key={idx} position={[cr.x, 0, cr.z]}>
            <mesh
              position={[0, 0.45, 0]}
              rotation={[0.12, idx * 0.8, -0.1]}
              castShadow
            >
              <octahedronGeometry args={[0.36, 0]} />
              <meshStandardMaterial
                color={cr.c}
                emissive={cr.c}
                emissiveIntensity={
                  1.1 + Math.sin(timeSec * 2.5 + idx) * 0.35
                }
                roughness={0.15}
                metalness={0.5}
              />
            </mesh>
            <mesh
              position={[0.25, 0.28, 0.12]}
              rotation={[-0.2, 0.4, 0.25]}
            >
              <octahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial
                color={cr.c}
                emissive={cr.c}
                emissiveIntensity={0.9}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (environment === "cyber-harbor") {
    const hoverBob = Math.sin(timeSec * 2.2) * 0.12;
    return (
      <group>
        <mesh
          position={[0, -0.25, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial
            color="#082f49"
            roughness={0.25}
            metalness={0.6}
          />
        </mesh>

        <mesh position={[0, -0.08, 0.6]} receiveShadow>
          <boxGeometry args={[10.5, 0.16, 6.8]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={stoneMat.roughness}
            metalness={0.25}
          />
        </mesh>

        <group position={[0, 0.55 + hoverBob, -3.8]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.4, 0.55, 1.8]} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.4}
              metalness={0.55}
            />
          </mesh>
          <mesh position={[-0.8, 0.42, 0]} castShadow>
            <boxGeometry args={[1.6, 0.38, 1.2]} />
            <meshStandardMaterial
              color="#0ea5e9"
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
          <mesh position={[1.9, -0.1, 0.65]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.26, 0.8, 10]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#06b6d4"
              emissiveIntensity={1.5}
            />
          </mesh>
          <mesh position={[1.9, -0.1, -0.65]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.26, 0.8, 10]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#06b6d4"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>

        {[-4.2, 4.2].map((bx, i) => (
          <group key={i} position={[bx, 0, -2.0]}>
            <mesh position={[0, 1.6, 0]} castShadow>
              <boxGeometry args={[0.55, 3.2, 0.55]} />
              <meshStandardMaterial
                color="#0f172a"
                roughness={0.35}
                metalness={0.6}
              />
            </mesh>
            <mesh position={[0, 2.8, 0.29]}>
              <boxGeometry args={[0.38, 0.7, 0.04]} />
              <meshStandardMaterial
                color={i === 0 ? "#f43f5e" : "#22d3ee"}
                emissive={i === 0 ? "#f43f5e" : "#22d3ee"}
                emissiveIntensity={1.6}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (environment === "desert-monolith") {
    const glyphRot = timeSec * 0.5;
    return (
      <group>
        <mesh
          position={[0, -0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[38, 24]} />
          <meshStandardMaterial
            color="#b45309"
            roughness={0.86}
            metalness={0.05}
            flatShading={stoneMat.flatShading}
          />
        </mesh>

        <mesh position={[0, -0.03, 0]} receiveShadow>
          <cylinderGeometry args={[4.5, 5.2, 0.14, 8]} />
          <meshStandardMaterial
            color="#78350f"
            roughness={0.8}
            flatShading={stoneMat.flatShading}
          />
        </mesh>

        <group position={[0, 0, -2.5]}>
          <mesh position={[0, 1.85, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.35, 0.78, 3.7, 4]} />
            <meshStandardMaterial
              color="#292524"
              roughness={0.35}
              metalness={0.55}
              flatShading
            />
          </mesh>
          <mesh
            position={[0, 2.5, 0]}
            rotation={[Math.PI / 3, glyphRot, 0]}
            castShadow
          >
            <torusGeometry args={[1.25, 0.06, 8, 20]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#d97706"
              emissiveIntensity={0.9}
              roughness={0.25}
              metalness={0.65}
            />
          </mesh>
        </group>

        {perimeterPeaks.slice(0, 10).map((p, idx) => (
          <mesh
            key={idx}
            position={[p.x * 0.75, p.height * 0.35, p.z * 0.75]}
            rotation={[0, p.rotY, 0]}
          >
            <cylinderGeometry
              args={[p.radius * 0.55, p.radius * 0.9, p.height * 0.8, 6]}
            />
            <meshStandardMaterial
              color="#92400e"
              roughness={0.9}
              flatShading
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (environment === "floating-sanctuary") {
    return (
      <group>
        <mesh position={[0, -0.2, 0]} receiveShadow>
          <cylinderGeometry args={[7.2, 6.2, 0.4, segs * 2]} />
          <meshStandardMaterial
            color="#cbd5e1"
            roughness={0.6}
            metalness={0.15}
            flatShading={stoneMat.flatShading}
          />
        </mesh>
        <mesh position={[0, -2.6, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[6.1, 4.4, segs]} />
          <meshStandardMaterial
            color="#475569"
            roughness={0.85}
            flatShading
          />
        </mesh>

        <group position={[0, 0, -2.8]}>
          <mesh position={[0, 2.1, 0]} castShadow>
            <torusGeometry args={[2.2, 0.18, 8, segs * 2, Math.PI]} />
            <meshStandardMaterial
              color="#e2e8f0"
              roughness={0.3}
              metalness={0.5}
            />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <circleGeometry args={[2.0, 24]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={1.4}
              transparent
              opacity={0.45}
            />
          </mesh>
        </group>
      </group>
    );
  }

  return (
    <group>
      <mesh
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[24, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.95, 3.02, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};
