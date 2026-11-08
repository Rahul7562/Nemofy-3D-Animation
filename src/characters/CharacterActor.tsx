import React from "react";
import {
  CharacterConfig,
  LipSyncEnvelopePoint,
  SceneCharacterPlacement,
  VisualStyle,
} from "../utils/types";
import { computeCharacterPoseAtFrame } from "../utils/animation-math";
import { GLTFCharacterLoader } from "./GLTFCharacterLoader";

interface CharacterActorProps {
  config: CharacterConfig;
  placement: SceneCharacterPlacement;
  visualStyle: VisualStyle;
  localFrame: number;
  durationInFrames: number;
  fps: number;
  lipSyncData?: LipSyncEnvelopePoint[] | null;
  isSelected?: boolean;
  showDirectorGizmos?: boolean;
}

export const CharacterActor: React.FC<CharacterActorProps> = ({
  config,
  placement,
  visualStyle,
  localFrame,
  durationInFrames,
  fps,
  lipSyncData = null,
  isSelected = false,
  showDirectorGizmos = false,
}) => {
  const pose = computeCharacterPoseAtFrame(
    placement,
    localFrame,
    durationInFrames,
    fps,
    `${config.id}-${placement.action}`,
    lipSyncData,
  );

  return (
    <group
      position={pose.worldPosition}
      rotation={[0, pose.worldRotationY, 0]}
    >
      <mesh
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <circleGeometry args={[0.42 * config.scale, 16]} />
        <meshBasicMaterial
          color="#020617"
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>

      {showDirectorGizmos && (isSelected || placement.speaking) && (
        <mesh
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <ringGeometry
            args={[0.46 * config.scale, 0.52 * config.scale, 24]}
          />
          <meshBasicMaterial
            color={placement.speaking ? "#38bdf8" : "#f59e0b"}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      )}

      <GLTFCharacterLoader
        config={config}
        pose={pose}
        visualStyle={visualStyle}
        localFrame={localFrame}
        fps={fps}
      />
    </group>
  );
};
