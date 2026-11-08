import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CharacterConfig,
  CharacterJointPose,
  GlbValidationReport,
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

export function inspectAndValidateGLTF(
  gltf: GLTF,
  fileName: string,
  fileSizeBytes: number,
): GlbValidationReport {
  let meshCount = 0;
  let vertexCount = 0;
  let boneCount = 0;
  let hasFacialMorphTargets = false;
  const warnings: string[] = [];

  gltf.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      meshCount++;
      const mesh = obj as THREE.Mesh;
      const posAttr = mesh.geometry?.attributes?.position;
      if (posAttr) {
        vertexCount += posAttr.count;
      }
      if (
        mesh.morphTargetDictionary &&
        Object.keys(mesh.morphTargetDictionary).length > 0
      ) {
        hasFacialMorphTargets = true;
      }
    }
    if ((obj as THREE.Bone).isBone) {
      boneCount++;
    }
  });

  const animationClipNames = (gltf.animations || []).map(
    (clip, idx) => clip.name || `Clip_${idx + 1}`,
  );
  const hasSkeletalRig = boneCount > 0;

  if (meshCount === 0) {
    warnings.push("No renderable meshes detected in GLB/GLTF scene graph.");
  }
  if (!hasSkeletalRig) {
    warnings.push(
      "Model has no skeletal bones; root transform & procedural head/jaw fallback will be applied.",
    );
  }
  if (animationClipNames.length === 0) {
    warnings.push(
      "No embedded animation clips found; procedural bone/transform animation will drive movement.",
    );
  }

  return {
    valid: meshCount > 0,
    fileName,
    fileSizeBytes,
    meshCount,
    vertexCount,
    hasSkeletalRig,
    boneCount,
    animationClipNames,
    hasFacialMorphTargets,
    warnings,
  };
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
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          for (const [morphName, morphIdx] of Object.entries(
            mesh.morphTargetDictionary,
          )) {
            const lower = morphName.toLowerCase();
            if (
              lower.includes("mouthopen") ||
              lower.includes("jawopen") ||
              lower.includes("viseme_aa")
            ) {
              mesh.morphTargetInfluences[morphIdx] = pose.mouthOpenness;
            } else if (lower.includes("blink")) {
              mesh.morphTargetInfluences[morphIdx] = pose.eyeBlink;
            }
          }
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
