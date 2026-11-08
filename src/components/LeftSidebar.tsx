import React, { useState } from "react";
import {
  Box,
  Users,
  Palette,
  Upload,
  Plus,
  Trash2,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Mic,
} from "lucide-react";
import {
  AspectRatioPreset,
  CharacterConfig,
  FpsPreset,
  StudioProject,
  VisualStyle,
} from "../utils/types";
import { VISUAL_STYLE_PRESETS } from "../assets/preset-library";

interface LeftSidebarProps {
  project: StudioProject;
  selectedSceneId: string;
  selectedCharacterId: string;
  activeCompositionMode: "cinematic" | "phone-demo";
  onSelectCompositionMode: (mode: "cinematic" | "phone-demo") => void;
  onSelectScene: (sceneId: string) => void;
  onSelectCharacter: (charId: string) => void;
  onUpdateStyle: (style: VisualStyle) => void;
  onUpdateAspectRatio: (aspect: AspectRatioPreset) => void;
  onUpdateFps: (fps: FpsPreset) => void;
  onUploadCharacterGlb: (charId: string, file: File) => void;
  onUpdateCharacter: (char: CharacterConfig) => void;
  onAddCharacter: () => void;
  onDeleteScene: (sceneId: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  project,
  selectedSceneId,
  selectedCharacterId,
  activeCompositionMode,
  onSelectCompositionMode,
  onSelectScene,
  onSelectCharacter,
  onUpdateStyle,
  onUpdateAspectRatio,
  onUpdateFps,
  onUploadCharacterGlb,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteScene,
}) => {
  const [tab, setTab] = useState<"scenes" | "characters" | "style">("scenes");

  return (
    <aside className="w-72 bg-[#0E131F] border-r border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden">
      {/* Sidebar Section Switcher */}
      <div className="grid grid-cols-3 border-b border-slate-800/80 bg-[#0B0F17] p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab("scenes")}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
            tab === "scenes"
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Box className="w-3.5 h-3.5 text-indigo-400" />
          Scenes
        </button>
        <button
          type="button"
          onClick={() => setTab("characters")}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
            tab === "characters"
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          Rig Cast
        </button>
        <button
          type="button"
          onClick={() => setTab("style")}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold cursor-pointer ${
            tab === "style"
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          Styles
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {tab === "scenes" && (
          <>
            {/* Composition Switcher preserving original template */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Active Remotion Composition
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectCompositionMode("cinematic")}
                  className={`flex items-center justify-between p-2.5 rounded border text-left cursor-pointer ${
                    activeCompositionMode === "cinematic"
                      ? "bg-indigo-950/60 border-indigo-500 text-white"
                      : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">
                        CinematicStory (3D Studio)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Multi-scene 3D characters & environments
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectCompositionMode("phone-demo")}
                  className={`flex items-center justify-between p-2.5 rounded border text-left cursor-pointer ${
                    activeCompositionMode === "phone-demo"
                      ? "bg-indigo-950/60 border-indigo-500 text-white"
                      : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">
                        Scene (3D Phone Video Texture)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Original repository starter composition
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Scene Outliner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  3D Storyboard Scenes ({project.scenes.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {project.scenes.map((scene, idx) => {
                  const isSelected = scene.id === selectedSceneId;
                  return (
                    <div
                      key={scene.id}
                      onClick={() => {
                        onSelectCompositionMode("cinematic");
                        onSelectScene(scene.id);
                      }}
                      className={`p-2.5 rounded border cursor-pointer ${
                        isSelected
                          ? "bg-indigo-950/75 border-indigo-500 text-white"
                          : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate">
                          0{idx + 1}. {scene.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] text-cyan-400">
                            {scene.durationInSeconds}s
                          </span>
                          {project.scenes.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteScene(scene.id);
                              }}
                              title="Remove scene"
                              className="p-1 text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">{scene.environment}</span>
                        <span className="font-mono text-[10px]">
                          {scene.cameraMovement}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "characters" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                3D Character Cast ({project.characters.length})
              </span>
              <button
                type="button"
                onClick={onAddCharacter}
                className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Rig
              </button>
            </div>

            {project.characters.map((char) => {
              const isSelected = char.id === selectedCharacterId;
              return (
                <div
                  key={char.id}
                  onClick={() => onSelectCharacter(char.id)}
                  className={`p-3 rounded border space-y-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-950/60 border-indigo-500"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <input
                        type="text"
                        value={char.name}
                        onChange={(e) =>
                          onUpdateCharacter({ ...char, name: e.target.value })
                        }
                        className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-indigo-400"
                      />
                      <div className="text-[11px] text-slate-400">
                        {char.role} •{" "}
                        {char.glbUrl ? "Custom GLB Rig" : "Procedural 3D Rig"}
                      </div>
                    </div>
                    <span
                      style={{ backgroundColor: char.primaryColor }}
                      className="w-4 h-4 rounded-xs border border-white/20"
                    />
                  </div>

                  {char.voiceProfile && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300">
                      <Mic className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">
                        Voice: {char.voiceProfile.name} (
                        {char.voiceProfile.voiceId})
                      </span>
                    </div>
                  )}

                  {/* Color Swatches */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <label className="text-[10px] text-slate-400 flex flex-col gap-1">
                      Primary
                      <input
                        type="color"
                        value={char.primaryColor}
                        onChange={(e) =>
                          onUpdateCharacter({
                            ...char,
                            primaryColor: e.target.value,
                          })
                        }
                        className="w-full h-6 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                      />
                    </label>
                    <label className="text-[10px] text-slate-400 flex flex-col gap-1">
                      Secondary
                      <input
                        type="color"
                        value={char.secondaryColor}
                        onChange={(e) =>
                          onUpdateCharacter({
                            ...char,
                            secondaryColor: e.target.value,
                          })
                        }
                        className="w-full h-6 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                      />
                    </label>
                    <label className="text-[10px] text-slate-400 flex flex-col gap-1">
                      Accent
                      <input
                        type="color"
                        value={char.accentColor}
                        onChange={(e) =>
                          onUpdateCharacter({
                            ...char,
                            accentColor: e.target.value,
                          })
                        }
                        className="w-full h-6 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* GLB/GLTF Upload + Validation Report */}
                  <div className="pt-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 cursor-pointer">
                      <Upload className="w-3 h-3 text-cyan-400" />
                      <span>
                        {char.glbUrl
                          ? `Replace ${char.glbFileName || ".GLB"}`
                          : "Upload .GLB / .GLTF Model"}
                      </span>
                      <input
                        type="file"
                        accept=".glb,.gltf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onUploadCharacterGlb(char.id, file);
                          }
                        }}
                      />
                    </label>

                    {char.glbValidation && (
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono space-y-1">
                        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                          {char.glbValidation.valid ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                          )}
                          <span>
                            {char.glbValidation.meshCount} meshes •{" "}
                            {char.glbValidation.vertexCount} verts •{" "}
                            {char.glbValidation.boneCount} bones
                          </span>
                        </div>
                        {char.glbValidation.animationClipNames.length > 0 && (
                          <div className="text-cyan-400 truncate">
                            Clips:{" "}
                            {char.glbValidation.animationClipNames.join(", ")}
                          </div>
                        )}
                        {char.glbValidation.warnings.map((w, wi) => (
                          <div key={wi} className="text-amber-300">
                            • {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "style" && (
          <div className="space-y-4">
            {/* Aspect Ratio & Frame Rate */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Output Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["16:9", "9:16", "1:1"] as AspectRatioPreset[]).map(
                  (ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => onUpdateAspectRatio(ratio)}
                      className={`py-1.5 px-2 rounded border font-mono text-xs font-semibold cursor-pointer ${
                        project.brief.aspectRatio === ratio
                          ? "bg-indigo-600 border-indigo-400 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {ratio}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Deterministic Frame Rate
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {([30, 60] as FpsPreset[]).map((fpsVal) => (
                  <button
                    key={fpsVal}
                    type="button"
                    onClick={() => onUpdateFps(fpsVal)}
                    className={`py-1.5 px-2 rounded border font-mono text-xs font-semibold cursor-pointer ${
                      project.brief.fps === fpsVal
                        ? "bg-indigo-600 border-indigo-400 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {fpsVal} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Visual Style Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                3D Rendering Style Preset
              </label>
              <div className="space-y-1.5">
                {VISUAL_STYLE_PRESETS.map((style) => {
                  const active = project.brief.visualStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onUpdateStyle(style.id)}
                      className={`w-full text-left p-2.5 rounded border cursor-pointer ${
                        active
                          ? "bg-indigo-950/75 border-indigo-500 text-white"
                          : "bg-slate-900/75 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-semibold">{style.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {style.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
