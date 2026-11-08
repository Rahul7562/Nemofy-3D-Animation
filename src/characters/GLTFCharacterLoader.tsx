import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CharacterConfig,
  CharacterJointPose,
  VisualStyle,
} from "../utils/types";
import { ProceduralCharacter } from "./ProceduralCharacter";

interface GLTFCharacterLoaderProps {
  config: CharacterConfig;
  pose: CharacterJointPose;
  visualStyle: VisualStyle;
  localFrame: number;
  fps: number;
}

export const GLTFCharacterLoader: React.FC<GLTFCharacterLoaderProps> = ({
  config,
  pose,
  visualStyle,
  localFrame,
  fps,
}) => {
  const [loadedGltf, setLoadedGltf] = useState<GLTF | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!config.glbUrl) {
      setLoadedGltf(null);
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      config.glbUrl,
      (gltf) => {
        if (cancelled) return;
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        setLoadedGltf(gltf);
        setLoadFailed(false);
      },
      undefined,
      () => {
        if (!cancelled) {
          setLoadFailed(true);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [config.glbUrl]);

  const mixer = useMemo(() => {
    if (!loadedGltf || loadedGltf.animations.length === 0) return null;
    const m = new THREE.AnimationMixer(loadedGltf.scene);
    const action = m.clipAction(loadedGltf.animations[0]);
    action.play();
    return m;
  }, [loadedGltf]);

  useEffect(() => {
    if (!loadedGltf) return;
    const timeSec = localFrame / Math.max(1, fps);
    if (mixer) {
      mixer.setTime(timeSec);
    }

    loadedGltf.scene.traverse((child) => {
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
  }, [loadedGltf, mixer, localFrame, fps, pose]);

  if (!config.glbUrl || !loadedGltf || loadFailed) {
    return (
      <ProceduralCharacter
        config={config}
        pose={pose}
        visualStyle={visualStyle}
      />
    );
  }

  return (
    <group scale={config.scale} position={[0, pose.hipBobY, 0]}>
      <primitive object={loadedGltf.scene} />
    </group>
  );
};
