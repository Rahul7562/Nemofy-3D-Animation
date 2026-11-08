import React, { useState } from "react";
import { Sparkles, Upload, Loader2, ArrowRight } from "lucide-react";
import {
  AspectRatioPreset,
  BgmMood,
  CreativeBrief,
  FpsPreset,
  StoryboardScene,
  StudioProject,
  VisualStyle,
} from "../utils/types";
import { VISUAL_STYLE_PRESETS } from "../assets/preset-library";
import { buildDeterministicStoryboardFromBrief } from "../utils/default-project";

interface CreativeBriefModalProps {
  project: StudioProject;
  onUpdateBrief: (brief: CreativeBrief) => void;
  onApplyGeneratedStoryboard: (
    brief: CreativeBrief,
    scenes: StoryboardScene[],
  ) => void;
  onProceedToStoryboard: () => void;
}

export const CreativeBriefModal: React.FC<CreativeBriefModalProps> = ({
  project,
  onUpdateBrief,
  onApplyGeneratedStoryboard,
  onProceedToStoryboard,
}) => {
  const [form, setForm] = useState<CreativeBrief>(project.brief);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateStoryboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.storyConcept.trim()) {
      setErrorMsg(
        "Please provide both a Project Title and Story Concept before generating.",
      );
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    onUpdateBrief(form);

    try {
      const response = await fetch("/api/storyboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: form,
          characters: project.characters,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.scenes) && data.scenes.length > 0) {
        onApplyGeneratedStoryboard(form, data.scenes);
      } else {
        const fallback = buildDeterministicStoryboardFromBrief(
          form,
          project.characters,
        );
        onApplyGeneratedStoryboard(form, fallback);
      }
    } catch {
      const fallback = buildDeterministicStoryboardFromBrief(
        form,
        project.characters,
      );
      onApplyGeneratedStoryboard(form, fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 bg-[#090D16] overflow-y-auto p-6">
      <form
        onSubmit={handleGenerateStoryboard}
        className="max-w-4xl mx-auto bg-[#0E131F] border border-slate-800 rounded-lg p-6 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
              STAGE A // PRODUCTION BRIEF & AI STORYBOARDING
            </span>
            <h1 className="text-xl font-bold text-slate-100 mt-1">
              Creative Direction & 3D Production Parameters
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Define your story concept, visual aesthetic, aspect ratio, and
              character cast to synthesize a deterministic 3D storyboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onUpdateBrief(form);
              onProceedToStoryboard();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <span>Skip to Storyboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Production Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Chronicles of the Sunlit Observatory"
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Video Topic / Genre
            </label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="e.g., Sci-Fi Adventure Short Film"
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-200">
            Story Concept & Narrative Arc *
          </label>
          <textarea
            rows={3}
            value={form.storyConcept}
            onChange={(e) => setForm({ ...form, storyConcept: e.target.value })}
            placeholder="Describe the narrative arc, key dramatic turning points, and visual atmosphere..."
            className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Duration, Aspect Ratio, FPS, Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Target Duration (sec)
            </label>
            <input
              type="number"
              min={6}
              max={60}
              value={form.targetDurationSeconds}
              onChange={(e) =>
                setForm({
                  ...form,
                  targetDurationSeconds: Math.max(
                    6,
                    Math.min(60, Number(e.target.value) || 16),
                  ),
                })
              }
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Aspect Ratio
            </label>
            <select
              value={form.aspectRatio}
              onChange={(e) =>
                setForm({
                  ...form,
                  aspectRatio: e.target.value as AspectRatioPreset,
                })
              }
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value="16:9">1920 × 1080 (16:9 Landscape)</option>
              <option value="9:16">1080 × 1920 (9:16 Vertical)</option>
              <option value="1:1">1080 × 1080 (1:1 Square)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Frame Rate
            </label>
            <select
              value={form.fps}
              onChange={(e) =>
                setForm({
                  ...form,
                  fps: Number(e.target.value) as FpsPreset,
                })
              }
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value={30}>30 FPS (Cinematic Standard)</option>
              <option value={60}>60 FPS (High Frame Rate)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              3D Visual Style
            </label>
            <select
              value={form.visualStyle}
              onChange={(e) =>
                setForm({
                  ...form,
                  visualStyle: e.target.value as VisualStyle,
                })
              }
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              {VISUAL_STYLE_PRESETS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Character Descriptions & Narration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Character Descriptions
            </label>
            <textarea
              rows={3}
              value={form.characterDescriptions}
              onChange={(e) =>
                setForm({ ...form, characterDescriptions: e.target.value })
              }
              className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Voice-Over Narration Script
            </label>
            <textarea
              rows={3}
              value={form.narrationScript}
              onChange={(e) =>
                setForm({ ...form, narrationScript: e.target.value })
              }
              className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
          </div>
        </div>

        {/* Background Music & Reference Image Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Background Music Mood (Procedural WAV Synthesizer)
            </label>
            <select
              value={form.bgmMood}
              onChange={(e) =>
                setForm({
                  ...form,
                  bgmMood: e.target.value as BgmMood,
                })
              }
              className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value="orchestral-wonder">
                Orchestral Wonder Harmonic Pad
              </option>
              <option value="ambient-synth">
                Cyberpunk Ambient Synth Arpeggio
              </option>
              <option value="cinematic-pulse">
                Sub-Bass Cinematic Pulse
              </option>
              <option value="lofi-warmth">
                Stylized Warm Acoustic Cadence
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Visual Reference Boards ({form.referenceImages.length} attached)
            </label>
            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Attach Reference Moodboard Image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setForm({
                      ...form,
                      referenceImages: [
                        ...form.referenceImages,
                        {
                          id: `ref-${Date.now()}`,
                          name: file.name,
                          dataUrl: url,
                          notes: "Visual mood reference",
                        },
                      ],
                    });
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing 3D Scene Storyboard...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI 3D Storyboard & Scenes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
