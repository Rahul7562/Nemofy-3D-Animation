import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  CharacterConfig,
  StoryboardScene,
  VisualStyle,
} from "../utils/types";
import { LightingAndAtmosphere } from "../effects/LightingAndAtmosphere";
import { DeterministicCameraRig } from "../cameras/DeterministicCameraRig";
import { ProceduralEnvironments } from "../environments/ProceduralEnvironments";
import { CharacterActor } from "../characters/CharacterActor";

interface StageScene3DProps {
  scene: StoryboardScene;
  characters: CharacterConfig[];
  projectVisualStyle: VisualStyle;
  localFrame: number;
  durationInFrames: number;
  fps: number;
  selectedCharacterId?: string | null;
  interactiveDirectorMode?: boolean;
}

export const StageScene3D: React.FC<StageScene3DProps> = ({
  scene,
  characters,
  projectVisualStyle,
  localFrame,
  durationInFrames,
  fps,
  selectedCharacterId = null,
  interactiveDirectorMode = false,
}) => {
  const activeStyle = scene.visualStyleOverride ?? projectVisualStyle;
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [
    invalidate,
    localFrame,
    scene,
    characters,
    activeStyle,
    selectedCharacterId,
    interactiveDirectorMode,
  ]);

  return (
    <group>
      <LightingAndAtmosphere
        preset={scene.lightingPreset}
        intensityMultiplier={scene.lightIntensity}
        fogDensity={scene.fogDensity}
        weatherEffect={scene.weatherEffect}
        localFrame={localFrame}
        fps={fps}
      />

      <DeterministicCameraRig
        scene={scene}
        visualStyle={activeStyle}
        localFrame={localFrame}
        durationInFrames={durationInFrames}
        fps={fps}
        interactiveDirectorMode={interactiveDirectorMode}
      />

      <ProceduralEnvironments
        environment={scene.environment}
        visualStyle={activeStyle}
        localFrame={localFrame}
        fps={fps}
      />

      {scene.characters.map((placement, idx) => {
        const charConfig =
          characters.find((c) => c.id === placement.characterId) ??
          characters[0];
        if (!charConfig) return null;

        return (
          <CharacterActor
            key={`${placement.characterId}-${idx}`}
            config={charConfig}
            placement={placement}
            visualStyle={activeStyle}
            localFrame={localFrame}
            durationInFrames={durationInFrames}
            fps={fps}
            isSelected={selectedCharacterId === placement.characterId}
            showDirectorGizmos={interactiveDirectorMode}
          />
        );
      })}
    </group>
  );
};
