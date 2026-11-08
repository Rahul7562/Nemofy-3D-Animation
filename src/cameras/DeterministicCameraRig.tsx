import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { StoryboardScene, VisualStyle } from "../utils/types";
import { computeCameraTransformAtFrame } from "../utils/animation-math";

interface DeterministicCameraRigProps {
  scene: StoryboardScene;
  visualStyle: VisualStyle;
  localFrame: number;
  durationInFrames: number;
  fps: number;
  interactiveDirectorMode?: boolean;
}

const _lookTarget = new THREE.Vector3();

export const DeterministicCameraRig: React.FC<DeterministicCameraRigProps> = ({
  scene,
  visualStyle,
  localFrame,
  durationInFrames,
  fps,
  interactiveDirectorMode = false,
}) => {
  const camera = useThree((state) => state.camera);

  const camState = useMemo(
    () =>
      computeCameraTransformAtFrame(scene, localFrame, durationInFrames, fps),
    [scene, localFrame, durationInFrames, fps],
  );

  useEffect(() => {
    if (interactiveDirectorMode) return;

    const [px, py, pz] = camState.position;
    const [tx, ty, tz] = camState.target;

    if (visualStyle === "isometric") {
      camera.position.set(
        px * 1.35 + 4.5,
        Math.max(5.5, py * 1.6),
        pz * 1.35 + 4.5,
      );
    } else {
      camera.position.set(px, py, pz);
    }

    _lookTarget.set(tx, ty, tz);
    camera.lookAt(_lookTarget);
    camera.rotation.z += camState.roll;

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = visualStyle === "isometric" ? 24 : camState.fov;
      persp.near = 0.1;
      persp.far = 250;
      persp.updateProjectionMatrix();
    }
  }, [camera, camState, visualStyle, interactiveDirectorMode]);

  const pathPoints = useMemo(() => {
    if (!interactiveDirectorMode) return null;
    const pts: THREE.Vector3[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const f = Math.round((i / steps) * Math.max(1, durationInFrames - 1));
      const st = computeCameraTransformAtFrame(scene, f, durationInFrames, fps);
      pts.push(new THREE.Vector3(...st.position));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [interactiveDirectorMode, scene, durationInFrames, fps]);

  if (!interactiveDirectorMode) {
    return null;
  }

  return (
    <group>
      <OrbitControls
        makeDefault
        enableDamping={false}
        target={camState.target}
        maxPolarAngle={Math.PI * 0.48}
        minDistance={1.5}
        maxDistance={28}
      />
      <group position={camState.position}>
        <mesh>
          <boxGeometry args={[0.32, 0.22, 0.42]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
      {pathPoints && (
        <mesh>
          <tubeGeometry args={[pathPoints, 20, 0.025, 6, false]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  );
};
