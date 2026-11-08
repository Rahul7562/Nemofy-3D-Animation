import React from "react";
import { Camera, Sun, CloudRain, UserCheck, MessageSquare } from "lucide-react";
import {
  CameraMovementType,
  CharacterAction,
  EnvironmentType,
  LightingPreset,
  StoryboardScene,
  StudioProject,
  TransitionType,
  WeatherEffect,
} from "../utils/types";
import {
  CAMERA_MOVEMENT_PRESETS,
  CHARACTER_ACTIONS,
  ENVIRONMENT_PRESETS,
  LIGHTING_PRESETS,
  TRANSITION_PRESETS,
  WEATHER_PRESETS,
} from "../assets/preset-library";

interface RightInspectorProps {
  project: StudioProject;
  selectedScene: StoryboardScene;
  onUpdateScene: (updated: StoryboardScene) => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  project,
  selectedScene,
  onUpdateScene,
}) => {
  const updateVec3 = (
    current: [number, number, number],
    axis: 0 | 1 | 2,
    val: number,
  ): [number, number, number] => {
    const next: [number, number, number] = [...current];
    next[axis] = val;
    return next;
  };

  return (
    <aside className="w-80 bg-[#0E131F] border-l border-slate-800/80 flex flex-col shrink-0 select-none overflow-y-auto p-3.5 space-y-5">
      {/* Scene Identity & Environment */}
      <div className="space-y-2.5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Scene Properties
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            ID: {selectedScene.id}
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300 font-medium">
            Scene Title
          </label>
          <input
            type="text"
            value={selectedScene.title}
            onChange={(e) =>
              onUpdateScene({ ...selectedScene, title: e.target.value })
            }
            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium">
              3D Environment
            </label>
            <select
              value={selectedScene.environment}
              onChange={(e) =>
                onUpdateScene({
                  ...selectedScene,
                  environment: e.target.value as EnvironmentType,
                })
              }
              className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              {ENVIRONMENT_PRESETS.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium">
              Duration (sec)
            </label>
            <input
              type="number"
              min={2}
              max={20}
              step={1}
              value={selectedScene.durationInSeconds}
              onChange={(e) =>
                onUpdateScene({
                  ...selectedScene,
                  durationInSeconds: Math.max(
                    2,
                    Math.min(20, Number(e.target.value) || 4),
                  ),
                })
              }
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Camera Choreography Controls */}
      <div className="space-y-2.5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
          <Camera className="w-3.5 h-3.5" />
          <span>Camera Choreography</span>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300 font-medium">
            Camera Rig Movement
          </label>
          <select
            value={selectedScene.cameraMovement}
            onChange={(e) =>
              onUpdateScene({
                ...selectedScene,
                cameraMovement: e.target.value as CameraMovementType,
              })
            }
            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
          >
            {CAMERA_MOVEMENT_PRESETS.map((cam) => (
              <option key={cam.id} value={cam.id}>
                [{cam.shotType}] {cam.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Focal Field of View (FOV)</span>
            <span className="font-mono text-cyan-400">
              {selectedScene.cameraFov}°
            </span>
          </div>
          <input
            type="range"
            min={24}
            max={75}
            value={selectedScene.cameraFov}
            onChange={(e) =>
              onUpdateScene({
                ...selectedScene,
                cameraFov: Number(e.target.value),
              })
            }
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Camera Base Position XYZ */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">
            Camera Start Coordinates (X / Y / Z)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["X", "Y", "Z"] as const).map((axisLabel, idx) => (
              <div
                key={axisLabel}
                className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1"
              >
                <span className="font-mono text-[10px] text-slate-500 mr-1.5">
                  {axisLabel}
                </span>
                <input
                  type="number"
                  step={0.5}
                  value={selectedScene.cameraStartPos[idx as 0 | 1 | 2]}
                  onChange={(e) =>
                    onUpdateScene({
                      ...selectedScene,
                      cameraStartPos: updateVec3(
                        selectedScene.cameraStartPos,
                        idx as 0 | 1 | 2,
                        Number(e.target.value),
                      ),
                    })
                  }
                  className="w-full bg-transparent font-mono text-xs text-slate-200 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lighting & Atmosphere */}
      <div className="space-y-2.5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
          <Sun className="w-3.5 h-3.5" />
          <span>Lighting & Atmosphere</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Lighting Rig</label>
            <select
              value={selectedScene.lightingPreset}
              onChange={(e) =>
                onUpdateScene({
                  ...selectedScene,
                  lightingPreset: e.target.value as LightingPreset,
                })
              }
              className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              {LIGHTING_PRESETS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-cyan-400" /> Particles
            </label>
            <select
              value={selectedScene.weatherEffect}
              onChange={(e) =>
                onUpdateScene({
                  ...selectedScene,
                  weatherEffect: e.target.value as WeatherEffect,
                })
              }
              className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              {WEATHER_PRESETS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Key Light Exposure</span>
            <span className="font-mono text-amber-400">
              {selectedScene.lightIntensity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.4}
            max={2.2}
            step={0.1}
            value={selectedScene.lightIntensity}
            onChange={(e) =>
              onUpdateScene({
                ...selectedScene,
                lightIntensity: Number(e.target.value),
              })
            }
            className="w-full accent-amber-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">Scene Transition</label>
          <select
            value={selectedScene.transitionToNext}
            onChange={(e) =>
              onUpdateScene({
                ...selectedScene,
                transitionToNext: e.target.value as TransitionType,
              })
            }
            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
          >
            {TRANSITION_PRESETS.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Character Blocking & Actions */}
      <div className="space-y-2.5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Character Blocking & Rig Actions</span>
        </div>

        {selectedScene.characters.map((placement, idx) => {
          const charObj = project.characters.find(
            (c) => c.id === placement.characterId,
          );
          return (
            <div
              key={`${placement.characterId}-${idx}`}
              className="p-2.5 rounded bg-slate-950/90 border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  {charObj?.name ?? placement.characterId}
                </span>
                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={placement.speaking}
                    onChange={(e) => {
                      const next = [...selectedScene.characters];
                      next[idx] = {
                        ...placement,
                        speaking: e.target.checked,
                      };
                      onUpdateScene({ ...selectedScene, characters: next });
                    }}
                  />
                  Lip-Sync
                </label>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-slate-400">
                    Animation Clip
                  </label>
                  <select
                    value={placement.action}
                    onChange={(e) => {
                      const next = [...selectedScene.characters];
                      next[idx] = {
                        ...placement,
                        action: e.target.value as CharacterAction,
                      };
                      onUpdateScene({ ...selectedScene, characters: next });
                    }}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100"
                  >
                    {CHARACTER_ACTIONS.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">
                    Stage X Pos
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={placement.startPosition[0]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const next = [...selectedScene.characters];
                      next[idx] = {
                        ...placement,
                        startPosition: [
                          val,
                          placement.startPosition[1],
                          placement.startPosition[2],
                        ],
                        endPosition: [
                          val,
                          placement.endPosition[1],
                          placement.endPosition[2],
                        ],
                      };
                      onUpdateScene({ ...selectedScene, characters: next });
                    }}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-100"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogue & Voice-Over Lip-Sync Script */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Dialogue & Lip-Sync Script</span>
        </div>
        <textarea
          rows={3}
          value={selectedScene.narrationText}
          onChange={(e) =>
            onUpdateScene({
              ...selectedScene,
              narrationText: e.target.value,
              characters: selectedScene.characters.map((c) =>
                c.speaking ? { ...c, dialogueLine: e.target.value } : c,
              ),
            })
          }
          placeholder="Enter spoken narration or character dialogue..."
          className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500"
        />
      </div>
    </aside>
  );
};
