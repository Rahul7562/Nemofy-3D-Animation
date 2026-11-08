import React from "react";
import {
  CharacterConfig,
  EnvironmentType,
  StoryboardScene,
  VisualStyle,
} from "../utils/types";
import { StageScene3D } from "../animations/StageScene3D";

export interface ModularSceneProps {
  scene: StoryboardScene;
  characters: CharacterConfig[];
  projectVisualStyle: VisualStyle;
  localFrame: number;
  durationInFrames: number;
  fps: number;
  selectedCharacterId?: string | null;
  interactiveDirectorMode?: boolean;
}

export const ObservatoryCitadelScene: React.FC<ModularSceneProps> = (props) => (
  <StageScene3D
    {...props}
    scene={{ ...props.scene, environment: "observatory-citadel" }}
  />
);

export const BioluminescentForestScene: React.FC<ModularSceneProps> = (
  props,
) => (
  <StageScene3D
    {...props}
    scene={{ ...props.scene, environment: "bioluminescent-forest" }}
  />
);

export const CyberHarborScene: React.FC<ModularSceneProps> = (props) => (
  <StageScene3D
    {...props}
    scene={{ ...props.scene, environment: "cyber-harbor" }}
  />
);

export const DesertMonolithScene: React.FC<ModularSceneProps> = (props) => (
  <StageScene3D
    {...props}
    scene={{ ...props.scene, environment: "desert-monolith" }}
  />
);

export const FloatingSanctuaryScene: React.FC<ModularSceneProps> = (props) => (
  <StageScene3D
    {...props}
    scene={{ ...props.scene, environment: "floating-sanctuary" }}
  />
);

export const MinimalStudioScene: React.FC<ModularSceneProps> = (props) => (
  <StageScene3D
    {...props}
    scene={{ ...props.scene, environment: "minimal-studio" }}
  />
);

export const SceneComponentRegistry: Record<
  EnvironmentType,
  React.FC<ModularSceneProps>
> = {
  "observatory-citadel": ObservatoryCitadelScene,
  "bioluminescent-forest": BioluminescentForestScene,
  "cyber-harbor": CyberHarborScene,
  "desert-monolith": DesertMonolithScene,
  "floating-sanctuary": FloatingSanctuaryScene,
  "minimal-studio": MinimalStudioScene,
};
