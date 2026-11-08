import React, { useMemo } from "react";
import * as THREE from "three";
import {
  CharacterConfig,
  CharacterJointPose,
  VisualStyle,
} from "../utils/types";
import { getStyleMaterialProps } from "../materials/style-materials";

interface ProceduralCharacterProps {
  config: CharacterConfig;
  pose: CharacterJointPose;
  visualStyle: VisualStyle;
}

export const ProceduralCharacter: React.FC<ProceduralCharacterProps> = ({
  config,
  pose,
  visualStyle,
}) => {
  const isVoxel = visualStyle === "voxel";
  const segs =
    visualStyle === "low-poly" || visualStyle === "isometric"
      ? 6
      : visualStyle === "voxel"
        ? 4
        : 14;

  const primaryMat = useMemo(
    () =>
      getStyleMaterialProps(visualStyle, config.roughness, config.metalness),
    [visualStyle, config.roughness, config.metalness],
  );

  const secondaryMat = useMemo(
    () =>
      getStyleMaterialProps(
        visualStyle,
        Math.max(0.2, config.roughness - 0.2),
        Math.min(0.65, config.metalness + 0.15),
      ),
    [visualStyle, config.roughness, config.metalness],
  );

  const skinMat = useMemo(
    () => getStyleMaterialProps(visualStyle, 0.65, 0.08),
    [visualStyle],
  );

  const torsoExtrudeSettings = useMemo(
    () => ({
      depth: 0.28,
      bevelEnabled: !isVoxel,
      bevelSegments: visualStyle === "low-poly" ? 1 : 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    }),
    [isVoxel, visualStyle],
  );

  const torsoShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.22, 0);
    s.lineTo(0.22, 0);
    s.lineTo(0.27, 0.52);
    s.lineTo(-0.27, 0.52);
    s.closePath();
    return s;
  }, []);

  const eyeScaleY = Math.max(0.08, 1 - pose.eyeBlink * 0.92);
  const mouthOpenHeight = 0.022 + pose.mouthOpenness * 0.105;
  const mouthActualWidth = 0.085 + pose.mouthWidth * 0.085;

  if (config.archetype === "avian-drone") {
    const wingFlap = Math.sin(pose.hipBobY * 45) * 0.55;
    return (
      <group
        scale={config.scale}
        position={[0, 0.15 + pose.hipBobY, 0]}
        rotation={[pose.torsoLeanX, pose.torsoTwistY, 0]}
      >
        <mesh castShadow receiveShadow>
          {isVoxel ? (
            <boxGeometry args={[0.48, 0.42, 0.52]} />
          ) : (
            <dodecahedronGeometry args={[0.28, segs > 8 ? 1 : 0]} />
          )}
          <meshStandardMaterial
            color={config.primaryColor}
            roughness={primaryMat.roughness}
            metalness={primaryMat.metalness}
            flatShading={primaryMat.flatShading}
          />
        </mesh>

        <group
          position={[0, 0.06, 0.22]}
          rotation={[pose.headPitchX, pose.headYawY, 0]}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.16, 0.12, segs]} />
            <meshStandardMaterial
              color={config.secondaryColor}
              roughness={0.25}
              metalness={0.6}
              flatShading={primaryMat.flatShading}
            />
          </mesh>
          <mesh position={[0, 0.02, 0.07]} scale={[1, eyeScaleY, 1]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial
              color={config.accentColor}
              emissive={config.accentColor}
              emissiveIntensity={1.6}
              roughness={0.1}
            />
          </mesh>
        </group>

        <group position={[-0.26, 0.05, 0]} rotation={[0, 0, 0.25 + wingFlap]}>
          <mesh position={[-0.22, 0, 0]} castShadow>
            <boxGeometry args={[0.44, 0.05, 0.26]} />
            <meshStandardMaterial
              color={config.secondaryColor}
              roughness={secondaryMat.roughness}
              metalness={secondaryMat.metalness}
              flatShading={secondaryMat.flatShading}
            />
          </mesh>
        </group>
        <group position={[0.26, 0.05, 0]} rotation={[0, 0, -0.25 - wingFlap]}>
          <mesh position={[0.22, 0, 0]} castShadow>
            <boxGeometry args={[0.44, 0.05, 0.26]} />
            <meshStandardMaterial
              color={config.secondaryColor}
              roughness={secondaryMat.roughness}
              metalness={secondaryMat.metalness}
              flatShading={secondaryMat.flatShading}
            />
          </mesh>
        </group>

        <mesh position={[0, 0.08, -0.3]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.22, 0.08]} />
          <meshStandardMaterial
            color={config.accentColor}
            roughness={0.35}
            metalness={0.5}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group scale={config.scale}>
      <group position={[0, 0.72 + pose.hipBobY, 0]}>
        <mesh castShadow receiveShadow>
          {isVoxel ? (
            <boxGeometry args={[0.44, 0.16, 0.28]} />
          ) : (
            <cylinderGeometry args={[0.21, 0.19, 0.16, segs]} />
          )}
          <meshStandardMaterial
            color={config.secondaryColor}
            roughness={secondaryMat.roughness}
            metalness={secondaryMat.metalness}
            flatShading={secondaryMat.flatShading}
            bumpMap={secondaryMat.bumpMap}
            bumpScale={secondaryMat.bumpScale}
          />
        </mesh>

        <group
          position={[0, 0.08, 0]}
          rotation={[pose.torsoLeanX, pose.torsoTwistY, 0]}
        >
          <mesh position={[0, 0, -0.14]} castShadow receiveShadow>
            {isVoxel ? (
              <boxGeometry args={[0.5, 0.54, 0.3]} />
            ) : (
              <extrudeGeometry args={[torsoShape, torsoExtrudeSettings]} />
            )}
            <meshStandardMaterial
              color={config.primaryColor}
              roughness={primaryMat.roughness}
              metalness={primaryMat.metalness}
              flatShading={primaryMat.flatShading}
              bumpMap={primaryMat.bumpMap}
              bumpScale={primaryMat.bumpScale}
            />
          </mesh>

          {/* Scholar scarf / collar for Nemo & Leo */}
          {config.archetype === "scholar-humanoid" && (
            <mesh
              position={[0, 0.49, 0.02]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <torusGeometry args={[0.16, 0.042, 8, segs]} />
              <meshStandardMaterial
                color={config.secondaryColor}
                roughness={0.45}
                metalness={0.2}
                flatShading={secondaryMat.flatShading}
              />
            </mesh>
          )}

          <mesh position={[0, 0.32, 0.17]} castShadow>
            {config.archetype === "guardian-bot" ? (
              <octahedronGeometry args={[0.09, 0]} />
            ) : config.archetype === "scholar-humanoid" ? (
              <dodecahedronGeometry args={[0.065, 0]} />
            ) : (
              <torusGeometry args={[0.065, 0.02, 8, segs]} />
            )}
            <meshStandardMaterial
              color={config.accentColor}
              emissive={config.accentColor}
              emissiveIntensity={
                config.archetype === "guardian-bot" ? 1.2 : 0.65
              }
              roughness={0.25}
              metalness={0.6}
            />
          </mesh>

          <group position={[0, 0.28, -0.21]}>
            <mesh castShadow>
              <boxGeometry args={[0.32, 0.36, 0.16]} />
              <meshStandardMaterial
                color={config.secondaryColor}
                roughness={secondaryMat.roughness}
                metalness={secondaryMat.metalness}
                flatShading={secondaryMat.flatShading}
              />
            </mesh>
            <mesh position={[0, 0.12, -0.09]} castShadow>
              <torusGeometry args={[0.11, 0.018, 8, segs]} />
              <meshStandardMaterial
                color={config.accentColor}
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
          </group>

          <group
            position={[0, 0.58, 0]}
            rotation={[pose.headPitchX, pose.headYawY, 0]}
          >
            <mesh position={[0, 0.04, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.085, 0.1, segs]} />
              <meshStandardMaterial
                color={config.skinOrChassisColor}
                roughness={skinMat.roughness}
                metalness={skinMat.metalness}
                flatShading={skinMat.flatShading}
              />
            </mesh>

            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
              {isVoxel ? (
                <boxGeometry args={[0.36, 0.36, 0.36]} />
              ) : config.archetype === "guardian-bot" ? (
                <cylinderGeometry args={[0.17, 0.19, 0.32, 8]} />
              ) : (
                <sphereGeometry args={[0.2, segs, segs]} />
              )}
              <meshStandardMaterial
                color={config.skinOrChassisColor}
                roughness={skinMat.roughness}
                metalness={
                  config.archetype === "guardian-bot" ? 0.55 : skinMat.metalness
                }
                flatShading={skinMat.flatShading}
                bumpMap={skinMat.bumpMap}
                bumpScale={skinMat.bumpScale}
              />
            </mesh>

            {config.archetype === "guardian-bot" ? (
              <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[0.08, 0.14, 0.28]} />
                <meshStandardMaterial
                  color={config.primaryColor}
                  roughness={0.3}
                  metalness={0.6}
                  flatShading={primaryMat.flatShading}
                />
              </mesh>
            ) : config.archetype === "scholar-humanoid" ? (
              <group position={[0, 0.35, -0.01]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.19, 0.21, 0.09, segs]} />
                  <meshStandardMaterial
                    color={config.primaryColor}
                    roughness={primaryMat.roughness}
                    metalness={primaryMat.metalness}
                    flatShading={primaryMat.flatShading}
                  />
                </mesh>
                <mesh position={[0, 0.05, 0.04]} castShadow>
                  <boxGeometry args={[0.22, 0.04, 0.12]} />
                  <meshStandardMaterial
                    color={config.accentColor}
                    emissive={config.accentColor}
                    emissiveIntensity={0.4}
                    roughness={0.25}
                  />
                </mesh>
              </group>
            ) : (
              <mesh
                position={[0, 0.31, -0.02]}
                rotation={[-0.18, 0, 0]}
                castShadow
              >
                <coneGeometry args={[0.22, 0.22, segs]} />
                <meshStandardMaterial
                  color={config.primaryColor}
                  roughness={primaryMat.roughness}
                  metalness={primaryMat.metalness}
                  flatShading={primaryMat.flatShading}
                />
              </mesh>
            )}

            {/* Eyes */}
            <mesh position={[-0.07, 0.24, 0.175]} scale={[1, eyeScaleY, 1]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshStandardMaterial
                color={
                  config.archetype === "guardian-bot"
                    ? config.accentColor
                    : "#0f172a"
                }
                emissive={
                  config.archetype === "guardian-bot"
                    ? config.accentColor
                    : "#000000"
                }
                emissiveIntensity={
                  config.archetype === "guardian-bot" ? 1.5 : 0
                }
                roughness={0.1}
              />
            </mesh>
            <mesh position={[0.07, 0.24, 0.175]} scale={[1, eyeScaleY, 1]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshStandardMaterial
                color={
                  config.archetype === "guardian-bot"
                    ? config.accentColor
                    : "#0f172a"
                }
                emissive={
                  config.archetype === "guardian-bot"
                    ? config.accentColor
                    : "#000000"
                }
                emissiveIntensity={
                  config.archetype === "guardian-bot" ? 1.5 : 0
                }
                roughness={0.1}
              />
            </mesh>

            {/* Expressive Brow */}
            <mesh
              position={[
                -0.07,
                0.285 + (pose.browRaise ?? 0) * 0.02,
                0.178,
              ]}
              rotation={[0, 0, (pose.browRaise ?? 0) * 0.25]}
            >
              <boxGeometry args={[0.055, 0.012, 0.015]} />
              <meshStandardMaterial color={config.primaryColor} roughness={0.5} />
            </mesh>
            <mesh
              position={[
                0.07,
                0.285 + (pose.browRaise ?? 0) * 0.02,
                0.178,
              ]}
              rotation={[0, 0, -(pose.browRaise ?? 0) * 0.25]}
            >
              <boxGeometry args={[0.055, 0.012, 0.015]} />
              <meshStandardMaterial color={config.primaryColor} roughness={0.5} />
            </mesh>

            {/* Articulated Mouth / Jaw Cavity */}
            <mesh position={[0, 0.14 - pose.mouthOpenness * 0.022, 0.182]}>
              <boxGeometry args={[mouthActualWidth, mouthOpenHeight, 0.032]} />
              <meshStandardMaterial
                color={
                  config.archetype === "guardian-bot"
                    ? config.accentColor
                    : "#7f1d1d"
                }
                emissive={
                  config.archetype === "guardian-bot" &&
                  pose.mouthOpenness > 0.08
                    ? config.accentColor
                    : pose.mouthOpenness > 0.2
                      ? "#f43f5e"
                      : "#000000"
                }
                emissiveIntensity={
                  config.archetype === "guardian-bot" ? 1.3 : 0.35
                }
                roughness={0.35}
              />
            </mesh>
          </group>

          <group
            position={[-0.3, 0.45, 0]}
            rotation={[pose.leftUpperArmX, 0, pose.leftUpperArmZ]}
          >
            <mesh castShadow>
              <sphereGeometry args={[0.085, segs, segs]} />
              <meshStandardMaterial
                color={config.secondaryColor}
                roughness={secondaryMat.roughness}
                metalness={secondaryMat.metalness}
                flatShading={secondaryMat.flatShading}
              />
            </mesh>
            <mesh position={[0, -0.14, 0]} castShadow>
              {isVoxel ? (
                <boxGeometry args={[0.11, 0.26, 0.11]} />
              ) : (
                <cylinderGeometry args={[0.055, 0.05, 0.26, segs]} />
              )}
              <meshStandardMaterial
                color={config.primaryColor}
                roughness={primaryMat.roughness}
                metalness={primaryMat.metalness}
                flatShading={primaryMat.flatShading}
              />
            </mesh>
            <group
              position={[0, -0.27, 0]}
              rotation={[pose.leftForearmX, 0, 0]}
            >
              <mesh position={[0, -0.12, 0]} castShadow>
                {isVoxel ? (
                  <boxGeometry args={[0.1, 0.24, 0.1]} />
                ) : (
                  <cylinderGeometry args={[0.05, 0.045, 0.24, segs]} />
                )}
                <meshStandardMaterial
                  color={config.skinOrChassisColor}
                  roughness={skinMat.roughness}
                  metalness={skinMat.metalness}
                  flatShading={skinMat.flatShading}
                />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <sphereGeometry args={[0.055, segs, segs]} />
                <meshStandardMaterial
                  color={config.secondaryColor}
                  roughness={secondaryMat.roughness}
                  metalness={secondaryMat.metalness}
                />
              </mesh>
            </group>
          </group>

          <group
            position={[0.3, 0.45, 0]}
            rotation={[pose.rightUpperArmX, 0, pose.rightUpperArmZ]}
          >
            <mesh castShadow>
              <sphereGeometry args={[0.085, segs, segs]} />
              <meshStandardMaterial
                color={config.secondaryColor}
                roughness={secondaryMat.roughness}
                metalness={secondaryMat.metalness}
                flatShading={secondaryMat.flatShading}
              />
            </mesh>
            <mesh position={[0, -0.14, 0]} castShadow>
              {isVoxel ? (
                <boxGeometry args={[0.11, 0.26, 0.11]} />
              ) : (
                <cylinderGeometry args={[0.055, 0.05, 0.26, segs]} />
              )}
              <meshStandardMaterial
                color={config.primaryColor}
                roughness={primaryMat.roughness}
                metalness={primaryMat.metalness}
                flatShading={primaryMat.flatShading}
              />
            </mesh>
            <group
              position={[0, -0.27, 0]}
              rotation={[pose.rightForearmX, 0, 0]}
            >
              <mesh position={[0, -0.12, 0]} castShadow>
                {isVoxel ? (
                  <boxGeometry args={[0.1, 0.24, 0.1]} />
                ) : (
                  <cylinderGeometry args={[0.05, 0.045, 0.24, segs]} />
                )}
                <meshStandardMaterial
                  color={config.skinOrChassisColor}
                  roughness={skinMat.roughness}
                  metalness={skinMat.metalness}
                  flatShading={skinMat.flatShading}
                />
              </mesh>
              <mesh position={[0, -0.26, 0]} castShadow>
                <sphereGeometry args={[0.055, segs, segs]} />
                <meshStandardMaterial
                  color={config.secondaryColor}
                  roughness={secondaryMat.roughness}
                  metalness={secondaryMat.metalness}
                />
              </mesh>
            </group>
          </group>
        </group>

        <group position={[-0.12, -0.04, 0]} rotation={[pose.leftThighX, 0, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            {isVoxel ? (
              <boxGeometry args={[0.14, 0.34, 0.14]} />
            ) : (
              <cylinderGeometry args={[0.075, 0.062, 0.34, segs]} />
            )}
            <meshStandardMaterial
              color={config.secondaryColor}
              roughness={secondaryMat.roughness}
              metalness={secondaryMat.metalness}
              flatShading={secondaryMat.flatShading}
            />
          </mesh>
          <group position={[0, -0.34, 0]} rotation={[pose.leftShinX, 0, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              {isVoxel ? (
                <boxGeometry args={[0.12, 0.32, 0.12]} />
              ) : (
                <cylinderGeometry args={[0.06, 0.052, 0.32, segs]} />
              )}
              <meshStandardMaterial
                color={config.primaryColor}
                roughness={primaryMat.roughness}
                metalness={primaryMat.metalness}
                flatShading={primaryMat.flatShading}
              />
            </mesh>
            <mesh position={[0, -0.31, 0.04]} castShadow receiveShadow>
              <boxGeometry args={[0.13, 0.09, 0.22]} />
              <meshStandardMaterial
                color="#1e293b"
                roughness={0.5}
                metalness={0.3}
              />
            </mesh>
          </group>
        </group>

        <group position={[0.12, -0.04, 0]} rotation={[pose.rightThighX, 0, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            {isVoxel ? (
              <boxGeometry args={[0.14, 0.34, 0.14]} />
            ) : (
              <cylinderGeometry args={[0.075, 0.062, 0.34, segs]} />
            )}
            <meshStandardMaterial
              color={config.secondaryColor}
              roughness={secondaryMat.roughness}
              metalness={secondaryMat.metalness}
              flatShading={secondaryMat.flatShading}
            />
          </mesh>
          <group position={[0, -0.34, 0]} rotation={[pose.rightShinX, 0, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              {isVoxel ? (
                <boxGeometry args={[0.12, 0.32, 0.12]} />
              ) : (
                <cylinderGeometry args={[0.06, 0.052, 0.32, segs]} />
              )}
              <meshStandardMaterial
                color={config.primaryColor}
                roughness={primaryMat.roughness}
                metalness={primaryMat.metalness}
                flatShading={primaryMat.flatShading}
              />
            </mesh>
            <mesh position={[0, -0.31, 0.04]} castShadow receiveShadow>
              <boxGeometry args={[0.13, 0.09, 0.22]} />
              <meshStandardMaterial
                color="#1e293b"
                roughness={0.5}
                metalness={0.3}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
