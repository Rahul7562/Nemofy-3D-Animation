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
    () => getStyleMaterialProps(visualStyle, 0.55, 0.06),
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
  const mouthOpenHeight = 0.024 + pose.mouthOpenness * 0.115;
  const mouthActualWidth = 0.088 + pose.mouthWidth * 0.09;

  const isNemoAgent =
    config.id === "char-nemo" || config.archetype === "robot-companion";
  const isLeoCoder =
    config.id === "char-leo" ||
    (!isNemoAgent && config.archetype === "scholar-humanoid");

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
      </group>
    );
  }

  /**
   * NEMO — Authentic @agentmorphy Boxy Cube AI Coding Agent Companion
   * Wide warm coral-terracotta 3D cube body, vertical dark pixel eyes,
   * expressive lip-synced mouth cavity, stubby waving side-arms, and 4 stubby legs.
   */
  if (isNemoAgent) {
    const cubeColor =
      config.primaryColor && config.primaryColor !== "#0EA5E9"
        ? config.primaryColor
        : "#E06D53";
    const warmSideColor = "#F18F70";
    const legColor = "#C8563D";
    const squashY = pose.bodySquashY ?? 1.0;
    const invSquashXZ = 1 / Math.sqrt(Math.max(0.7, squashY));

    return (
      <group scale={config.scale}>
        <group position={[0, 0.42, 0]}>
          {/* Main Wide Cube Head/Body — Energetic bounce, 3D tilt/roll, and squash-and-stretch */}
          <group
            position={[0, pose.hipBobY * 0.95, 0]}
            scale={[invSquashXZ, squashY, invSquashXZ]}
            rotation={[
              pose.headPitchX * 0.85 + pose.torsoLeanX * 0.85,
              pose.headYawY * 0.95 + pose.torsoTwistY * 0.85,
              (pose.torsoRollZ ?? 0) + (pose.headRollZ ?? 0) * 0.65,
            ]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.62, 0.46, 0.48]} />
              <meshStandardMaterial
                color={cubeColor}
                roughness={0.44}
                metalness={0.08}
              />
            </mesh>

            {/* Right-Side Golden Rim-Light Bevel Accent (matches @agentmorphy warm key light) */}
            <mesh position={[0.306, 0, 0]} castShadow>
              <boxGeometry args={[0.018, 0.44, 0.46]} />
              <meshStandardMaterial
                color={warmSideColor}
                roughness={0.38}
                metalness={0.08}
              />
            </mesh>

            {/* Top Crown Bevel Plate */}
            <mesh position={[0, 0.232, 0]} castShadow>
              <boxGeometry args={[0.58, 0.016, 0.44]} />
              <meshStandardMaterial
                color={warmSideColor}
                roughness={0.4}
                metalness={0.08}
              />
            </mesh>

            {/* Vertical Rectangular Pixel Eyes */}
            <mesh
              position={[-0.135, 0.042, 0.242]}
              scale={[1, eyeScaleY, 1]}
            >
              <boxGeometry args={[0.056, 0.115, 0.024]} />
              <meshStandardMaterial color="#14141F" roughness={0.2} />
            </mesh>
            <mesh
              position={[0.135, 0.042, 0.242]}
              scale={[1, eyeScaleY, 1]}
            >
              <boxGeometry args={[0.056, 0.115, 0.024]} />
              <meshStandardMaterial color="#14141F" roughness={0.2} />
            </mesh>

            {/* Expressive Blocky Eyebrows */}
            <mesh
              position={[
                -0.135,
                0.132 + (pose.browRaise ?? 0) * 0.028,
                0.244,
              ]}
              rotation={[0, 0, (pose.browRaise ?? 0) * 0.26]}
            >
              <boxGeometry args={[0.078, 0.022, 0.024]} />
              <meshStandardMaterial color="#271519" roughness={0.35} />
            </mesh>
            <mesh
              position={[
                0.135,
                0.132 + (pose.browRaise ?? 0) * 0.028,
                0.244,
              ]}
              rotation={[0, 0, -(pose.browRaise ?? 0) * 0.26]}
            >
              <boxGeometry args={[0.078, 0.022, 0.024]} />
              <meshStandardMaterial color="#271519" roughness={0.35} />
            </mesh>

            {/* Articulated Lip-Sync Mouth Cavity */}
            <mesh position={[0, -0.095 - pose.mouthOpenness * 0.022, 0.242]}>
              <boxGeometry args={[mouthActualWidth, mouthOpenHeight, 0.028]} />
              <meshStandardMaterial color="#231014" roughness={0.35} />
            </mesh>
            {pose.mouthOpenness > 0.14 && (
              <mesh position={[0, -0.11 - pose.mouthOpenness * 0.024, 0.248]}>
                <boxGeometry
                  args={[mouthActualWidth * 0.65, mouthOpenHeight * 0.42, 0.02]}
                />
                <meshStandardMaterial color="#F43F5E" roughness={0.4} />
              </mesh>
            )}

            {/* Left & Right Articulated 2-Segment Free Waving Arms */}
            <group
              position={[-0.32, -0.01, 0.02]}
              rotation={[
                pose.leftUpperArmX * 0.85,
                pose.leftUpperArmY ?? 0,
                0.22 + pose.leftUpperArmZ * 0.85,
              ]}
            >
              <mesh position={[-0.048, -0.02, 0]} castShadow>
                <boxGeometry args={[0.105, 0.125, 0.135]} />
                <meshStandardMaterial color={cubeColor} roughness={0.44} />
              </mesh>
              <group
                position={[-0.085, -0.06, 0]}
                rotation={[
                  (pose.leftForearmX ?? -0.2) * 0.55,
                  0,
                  pose.leftForearmZ ?? 0,
                ]}
              >
                <mesh position={[-0.035, -0.03, 0]} castShadow>
                  <boxGeometry args={[0.09, 0.095, 0.115]} />
                  <meshStandardMaterial color={warmSideColor} roughness={0.4} />
                </mesh>
              </group>
            </group>
            <group
              position={[0.32, -0.01, 0.02]}
              rotation={[
                pose.rightUpperArmX * 0.85,
                pose.rightUpperArmY ?? 0,
                -0.22 + pose.rightUpperArmZ * 0.85,
              ]}
            >
              <mesh position={[0.048, -0.02, 0]} castShadow>
                <boxGeometry args={[0.105, 0.125, 0.135]} />
                <meshStandardMaterial color={warmSideColor} roughness={0.4} />
              </mesh>
              <group
                position={[0.085, -0.06, 0]}
                rotation={[
                  (pose.rightForearmX ?? -0.2) * 0.55,
                  0,
                  pose.rightForearmZ ?? 0,
                ]}
              >
                <mesh position={[0.035, -0.03, 0]} castShadow>
                  <boxGeometry args={[0.09, 0.095, 0.115]} />
                  <meshStandardMaterial color={warmSideColor} roughness={0.38} />
                </mesh>
              </group>
            </group>
          </group>

          {/* 4 Cute Stubby Blocky Legs */}
          <group
            position={[-0.165, -0.23, 0.105]}
            rotation={[pose.leftThighX * 0.75, 0, 0]}
          >
            <mesh position={[0, -0.095, 0]} castShadow>
              <boxGeometry args={[0.092, 0.21, 0.092]} />
              <meshStandardMaterial color={legColor} roughness={0.5} />
            </mesh>
          </group>
          <group
            position={[0.165, -0.23, 0.105]}
            rotation={[pose.rightThighX * 0.75, 0, 0]}
          >
            <mesh position={[0, -0.095, 0]} castShadow>
              <boxGeometry args={[0.092, 0.21, 0.092]} />
              <meshStandardMaterial color={warmSideColor} roughness={0.45} />
            </mesh>
          </group>
          <group
            position={[-0.165, -0.23, -0.105]}
            rotation={[pose.rightThighX * 0.65, 0, 0]}
          >
            <mesh position={[0, -0.095, 0]} castShadow>
              <boxGeometry args={[0.092, 0.21, 0.092]} />
              <meshStandardMaterial color={legColor} roughness={0.5} />
            </mesh>
          </group>
          <group
            position={[0.165, -0.23, -0.105]}
            rotation={[pose.leftThighX * 0.65, 0, 0]}
          >
            <mesh position={[0, -0.095, 0]} castShadow>
              <boxGeometry args={[0.092, 0.21, 0.092]} />
              <meshStandardMaterial color={legColor} roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    );
  }

  /**
   * LEO — Authentic @agentmorphy Blocky Chibi Developer (Blue Hoodie + White Collar Stripes + Spiky Hair)
   */
  if (isLeoCoder) {
    const hoodieBlue = "#3B5BDB";
    const pantsBlue = "#324AB2";
    const skinPeach = "#F2C2A5";
    const hairDark = "#1E1B4B";

    return (
      <group scale={config.scale}>
        <group position={[0, 0.54, 0]}>
          {/* Pelvis / Hip Block */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.14, 0.28]} />
            <meshStandardMaterial color={pantsBlue} roughness={0.5} />
          </mesh>

          {/* Torso Group (upper body breathes & shifts weight naturally while sneakers remain planted) */}
          <group
            position={[0, 0.06 + pose.hipBobY * 0.55, 0]}
            rotation={[
              pose.torsoLeanX,
              pose.torsoTwistY,
              pose.torsoRollZ ?? 0,
            ]}
          >
            {/* Cobalt-Blue Hoodie Torso */}
            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.45, 0.44, 0.29]} />
              <meshStandardMaterial
                color={hoodieBlue}
                roughness={0.46}
                metalness={0.08}
              />
            </mesh>

            {/* Center Hoodie Seam / Placket */}
            <mesh position={[0, 0.22, 0.147]}>
              <boxGeometry args={[0.1, 0.43, 0.012]} />
              <meshStandardMaterial color="#2B44B8" roughness={0.5} />
            </mesh>

            {/* Two Iconic Vertical White Collar/Drawstring Stripes on Chest */}
            <mesh position={[-0.088, 0.34, 0.152]} castShadow>
              <boxGeometry args={[0.062, 0.2, 0.018]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
            </mesh>
            <mesh position={[0.088, 0.34, 0.152]} castShadow>
              <boxGeometry args={[0.062, 0.2, 0.018]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
            </mesh>

            {/* Blocky Chibi Head + Spiky Hair Crown */}
            <group
              position={[0, 0.46, 0]}
              rotation={[
                pose.headPitchX,
                pose.headYawY,
                pose.headRollZ ?? 0,
              ]}
            >
              {/* Main Wide Blocky Head */}
              <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.4, 0.44]} />
                <meshStandardMaterial
                  color={skinPeach}
                  roughness={0.48}
                  metalness={0.05}
                />
              </mesh>

              {/* Blocky Side Ears */}
              <mesh position={[-0.265, 0.2, 0]} castShadow>
                <boxGeometry args={[0.05, 0.095, 0.08]} />
                <meshStandardMaterial color="#E5AF90" roughness={0.5} />
              </mesh>
              <mesh position={[0.265, 0.2, 0]} castShadow>
                <boxGeometry args={[0.05, 0.095, 0.08]} />
                <meshStandardMaterial color="#F6CBAF" roughness={0.45} />
              </mesh>

              {/* Hair Cap Base + Back Hair */}
              <group position={[0, 0.39, -0.01]}>
                <mesh castShadow>
                  <boxGeometry args={[0.53, 0.12, 0.47]} />
                  <meshStandardMaterial
                    color={hairDark}
                    roughness={0.55}
                    flatShading
                  />
                </mesh>
                <mesh position={[0, -0.12, -0.19]} castShadow>
                  <boxGeometry args={[0.52, 0.28, 0.1]} />
                  <meshStandardMaterial
                    color={hairDark}
                    roughness={0.55}
                    flatShading
                  />
                </mesh>

                {/* 5 Signature @agentmorphy Chunky Pyramidal Hair Spikes */}
                <mesh
                  position={[-0.16, 0.12, 0.07]}
                  rotation={[0.22, 0.2, 0.28]}
                  castShadow
                >
                  <coneGeometry args={[0.115, 0.19, 4]} />
                  <meshStandardMaterial
                    color={hairDark}
                    roughness={0.52}
                    flatShading
                  />
                </mesh>
                <mesh
                  position={[-0.07, 0.14, 0.11]}
                  rotation={[0.28, 0.1, 0.12]}
                  castShadow
                >
                  <coneGeometry args={[0.12, 0.21, 4]} />
                  <meshStandardMaterial
                    color={hairDark}
                    roughness={0.52}
                    flatShading
                  />
                </mesh>
                <mesh
                  position={[0.01, 0.15, 0.09]}
                  rotation={[0.25, 0.4, 0]}
                  castShadow
                >
                  <coneGeometry args={[0.125, 0.22, 4]} />
                  <meshStandardMaterial
                    color="#25215E"
                    roughness={0.5}
                    flatShading
                  />
                </mesh>
                <mesh
                  position={[0.09, 0.14, 0.11]}
                  rotation={[0.28, -0.15, -0.14]}
                  castShadow
                >
                  <coneGeometry args={[0.115, 0.2, 4]} />
                  <meshStandardMaterial
                    color="#25215E"
                    roughness={0.5}
                    flatShading
                  />
                </mesh>
                <mesh
                  position={[0.17, 0.11, 0.06]}
                  rotation={[0.2, -0.25, -0.3]}
                  castShadow
                >
                  <coneGeometry args={[0.11, 0.18, 4]} />
                  <meshStandardMaterial
                    color="#25215E"
                    roughness={0.5}
                    flatShading
                  />
                </mesh>
              </group>

              {/* Vertical Dark Pixel Eyes */}
              <mesh
                position={[-0.115, 0.215, 0.222]}
                scale={[1, eyeScaleY, 1]}
              >
                <boxGeometry args={[0.045, 0.085, 0.022]} />
                <meshStandardMaterial color="#111827" roughness={0.2} />
              </mesh>
              <mesh
                position={[0.115, 0.215, 0.222]}
                scale={[1, eyeScaleY, 1]}
              >
                <boxGeometry args={[0.045, 0.085, 0.022]} />
                <meshStandardMaterial color="#111827" roughness={0.2} />
              </mesh>

              {/* Expressive Eyebrows */}
              <mesh
                position={[
                  -0.115,
                  0.292 + (pose.browRaise ?? 0) * 0.026,
                  0.225,
                ]}
                rotation={[0, 0, (pose.browRaise ?? 0) * 0.26]}
              >
                <boxGeometry args={[0.072, 0.018, 0.022]} />
                <meshStandardMaterial color={hairDark} roughness={0.4} />
              </mesh>
              <mesh
                position={[
                  0.115,
                  0.292 + (pose.browRaise ?? 0) * 0.026,
                  0.225,
                ]}
                rotation={[0, 0, -(pose.browRaise ?? 0) * 0.26]}
              >
                <boxGeometry args={[0.072, 0.018, 0.022]} />
                <meshStandardMaterial color={hairDark} roughness={0.4} />
              </mesh>

              {/* Articulated Mouth Cavity + Tongue */}
              <mesh position={[0, 0.112 - pose.mouthOpenness * 0.02, 0.222]}>
                <boxGeometry
                  args={[mouthActualWidth, mouthOpenHeight, 0.028]}
                />
                <meshStandardMaterial color="#2A1215" roughness={0.35} />
              </mesh>
              {pose.mouthOpenness > 0.12 && (
                <mesh
                  position={[0, 0.098 - pose.mouthOpenness * 0.022, 0.228]}
                >
                  <boxGeometry
                    args={[
                      mouthActualWidth * 0.65,
                      mouthOpenHeight * 0.42,
                      0.02,
                    ]}
                  />
                  <meshStandardMaterial color="#F43F5E" roughness={0.4} />
                </mesh>
              )}
            </group>

            {/* Left Blocky Hoodie Arm with Full 3-Axis Free Hand Articulation */}
            <group
              position={[-0.29, 0.39, 0]}
              rotation={[
                pose.leftUpperArmX,
                pose.leftUpperArmY ?? 0,
                pose.leftUpperArmZ,
              ]}
            >
              <mesh position={[0, -0.11, 0]} castShadow>
                <boxGeometry args={[0.13, 0.23, 0.13]} />
                <meshStandardMaterial color={hoodieBlue} roughness={0.46} />
              </mesh>
              <group
                position={[0, -0.22, 0]}
                rotation={[
                  pose.leftForearmX,
                  pose.leftForearmY ?? 0,
                  pose.leftForearmZ ?? 0,
                ]}
              >
                <mesh position={[0, -0.1, 0]} castShadow>
                  <boxGeometry args={[0.12, 0.2, 0.12]} />
                  <meshStandardMaterial color={hoodieBlue} roughness={0.46} />
                </mesh>
                <group
                  position={[0, -0.21, 0]}
                  rotation={[pose.leftHandX ?? 0, 0, pose.leftHandZ ?? 0]}
                >
                  <mesh position={[0, -0.02, 0]} castShadow>
                    <boxGeometry args={[0.11, 0.105, 0.11]} />
                    <meshStandardMaterial color={skinPeach} roughness={0.48} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* Right Blocky Hoodie Arm with Full 3-Axis Free Hand Articulation */}
            <group
              position={[0.29, 0.39, 0]}
              rotation={[
                pose.rightUpperArmX,
                pose.rightUpperArmY ?? 0,
                pose.rightUpperArmZ,
              ]}
            >
              <mesh position={[0, -0.11, 0]} castShadow>
                <boxGeometry args={[0.13, 0.23, 0.13]} />
                <meshStandardMaterial color={hoodieBlue} roughness={0.46} />
              </mesh>
              <group
                position={[0, -0.22, 0]}
                rotation={[
                  pose.rightForearmX,
                  pose.rightForearmY ?? 0,
                  pose.rightForearmZ ?? 0,
                ]}
              >
                <mesh position={[0, -0.1, 0]} castShadow>
                  <boxGeometry args={[0.12, 0.2, 0.12]} />
                  <meshStandardMaterial color={hoodieBlue} roughness={0.46} />
                </mesh>
                <group
                  position={[0, -0.21, 0]}
                  rotation={[pose.rightHandX ?? 0, 0, pose.rightHandZ ?? 0]}
                >
                  <mesh position={[0, -0.02, 0]} castShadow>
                    <boxGeometry args={[0.11, 0.105, 0.11]} />
                    <meshStandardMaterial color={skinPeach} roughness={0.48} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>

          {/* Left Blocky Leg + Chunky White Sneaker */}
          <group
            position={[-0.115, -0.04, 0]}
            rotation={[pose.leftThighX, 0, 0]}
          >
            <mesh position={[0, -0.13, 0]} castShadow>
              <boxGeometry args={[0.155, 0.26, 0.155]} />
              <meshStandardMaterial color={pantsBlue} roughness={0.5} />
            </mesh>
            <group position={[0, -0.25, 0]} rotation={[pose.leftShinX, 0, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <boxGeometry args={[0.145, 0.24, 0.145]} />
                <meshStandardMaterial color={pantsBlue} roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.24, 0.035]} castShadow receiveShadow>
                <boxGeometry args={[0.165, 0.11, 0.23]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
              </mesh>
            </group>
          </group>

          {/* Right Blocky Leg + Chunky White Sneaker */}
          <group
            position={[0.115, -0.04, 0]}
            rotation={[pose.rightThighX, 0, 0]}
          >
            <mesh position={[0, -0.13, 0]} castShadow>
              <boxGeometry args={[0.155, 0.26, 0.155]} />
              <meshStandardMaterial color={pantsBlue} roughness={0.5} />
            </mesh>
            <group position={[0, -0.25, 0]} rotation={[pose.rightShinX, 0, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <boxGeometry args={[0.145, 0.24, 0.145]} />
                <meshStandardMaterial color={pantsBlue} roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.24, 0.035]} castShadow receiveShadow>
                <boxGeometry args={[0.165, 0.11, 0.23]} />
                <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
              </mesh>
            </group>
          </group>
        </group>
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
            />
          </mesh>

          <group
            position={[0, 0.58, 0]}
            rotation={[pose.headPitchX, pose.headYawY, 0]}
          >
            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
              <sphereGeometry args={[0.205, segs, segs]} />
              <meshStandardMaterial
                color={config.skinOrChassisColor}
                roughness={skinMat.roughness}
                metalness={skinMat.metalness}
                flatShading={skinMat.flatShading}
              />
            </mesh>
            <mesh position={[-0.07, 0.24, 0.188]} scale={[1, eyeScaleY, 1]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} />
            </mesh>
            <mesh position={[0.07, 0.24, 0.188]} scale={[1, eyeScaleY, 1]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.15 - pose.mouthOpenness * 0.022, 0.19]}>
              <boxGeometry args={[mouthActualWidth, mouthOpenHeight, 0.032]} />
              <meshStandardMaterial color="#7f1d1d" roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
