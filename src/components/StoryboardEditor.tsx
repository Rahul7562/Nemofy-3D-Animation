import React from "react";
import {
  CheckCircle2,
  Plus,
  Trash2,
  Camera,
  Sun,
  MapPin,
  Volume2,
} from "lucide-react";
import {
  CameraMovementType,
  EnvironmentType,
  LightingPreset,
  StoryboardScene,
  StudioProject,
  TransitionType,
} from "../utils/types";
import {
  CAMERA_MOVEMENT_PRESETS,
  ENVIRONMENT_PRESETS,
  LIGHTING_PRESETS,
  TRANSITION_PRESETS,
} from "../assets/preset-library";

interface StoryboardEditorProps {
  project: StudioProject;
  onUpdateScene: (scene: StoryboardScene) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onApproveStoryboard: () => void;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({
  project,
  onUpdateScene,
  onAddScene,
  onDeleteScene,
  onApproveStoryboard,
}) => {
  const totalDuration = project.scenes.reduce(
    (acc, s) => acc + s.durationInSeconds,
    0,
  );

  return (
    <div className="flex-1 bg-[#090D16] overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0E131F] border border-slate-800 rounded-lg p-5">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
              STAGE B // SCRIPT & SCENE-BY-SCENE 3D STORYBOARD
            </span>
            <h1 className="text-xl font-bold text-slate-100 mt-1">
              {project.brief.title} — Storyboard Breakdown (
              {project.scenes.length} Scenes, {totalDuration}s Total)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize every scene’s 3D environment, camera choreography,
              lighting rig, dialogue, sound effects, and transitions before
              entering the 3D Stage.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onAddScene}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Scene</span>
            </button>
            <button
              type="button"
              onClick={onApproveStoryboard}
              className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Open 3D Stage</span>
            </button>
          </div>
        </div>

        {/* Scene Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.scenes.map((scene, idx) => (
            <div
              key={scene.id}
              className="bg-[#0E131F] border border-slate-800 rounded-lg p-4 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 font-mono text-xs text-indigo-300 font-semibold shrink-0">
                    SHOT 0{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={scene.title}
                    onChange={(e) =>
                      onUpdateScene({ ...scene, title: e.target.value })
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-indigo-500 truncate"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-cyan-400">
                    {scene.durationInSeconds}s (
                    {scene.durationInSeconds * project.brief.fps}f)
                  </span>
                  {project.scenes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteScene(scene.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-400" /> 3D
                    Environment
                  </label>
                  <select
                    value={scene.environment}
                    onChange={(e) =>
                      onUpdateScene({
                        ...scene,
                        environment: e.target.value as EnvironmentType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {ENVIRONMENT_PRESETS.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-cyan-400" /> Camera
                    Movement
                  </label>
                  <select
                    value={scene.cameraMovement}
                    onChange={(e) =>
                      onUpdateScene({
                        ...scene,
                        cameraMovement: e.target.value as CameraMovementType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {CAMERA_MOVEMENT_PRESETS.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" /> Lighting Preset
                  </label>
                  <select
                    value={scene.lightingPreset}
                    onChange={(e) =>
                      onUpdateScene({
                        ...scene,
                        lightingPreset: e.target.value as LightingPreset,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {LIGHTING_PRESETS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Transition Out</label>
                  <select
                    value={scene.transitionToNext}
                    onChange={(e) =>
                      onUpdateScene({
                        ...scene,
                        transitionToNext: e.target.value as TransitionType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    {TRANSITION_PRESETS.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">
                  Spoken Dialogue / Narration
                </label>
                <textarea
                  rows={2}
                  value={scene.narrationText}
                  onChange={(e) =>
                    onUpdateScene({ ...scene, narrationText: e.target.value })
                  }
                  className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-emerald-400" /> Sound
                    Effect Cues
                  </label>
                  <input
                    type="text"
                    value={scene.soundEffects.join(", ")}
                    onChange={(e) =>
                      onUpdateScene({
                        ...scene,
                        soundEffects: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400">Duration (Seconds)</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={scene.durationInSeconds}
                    onChange={(e) =>
                      onUpdateScene({
                        ...scene,
                        durationInSeconds: Math.max(
                          2,
                          Math.min(20, Number(e.target.value) || 4),
                        ),
                      })
                    }
                    className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-cyan-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
