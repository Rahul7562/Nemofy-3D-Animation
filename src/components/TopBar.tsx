import React from "react";
import {
  Clapperboard,
  FileText,
  Layers,
  Film,
  Download,
  Sliders,
} from "lucide-react";
import { WorkflowStage } from "../utils/types";

interface TopBarProps {
  projectTitle: string;
  activeStage: WorkflowStage;
  onSelectStage: (stage: WorkflowStage) => void;
  onOpenExport: () => void;
}

const STAGE_ITEMS: Array<{
  id: WorkflowStage;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: "brief", label: "Creative Brief", icon: FileText },
  { id: "storyboard", label: "Storyboard", icon: Layers },
  { id: "stage3d", label: "3D Stage", icon: Clapperboard },
  { id: "timeline", label: "Timeline", icon: Sliders },
  { id: "export", label: "Export MP4", icon: Film },
];

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle,
  activeStage,
  onSelectStage,
  onOpenExport,
}) => {
  return (
    <header className="h-14 px-5 bg-[#0B0F17] border-b border-slate-800/80 flex items-center justify-between shrink-0 select-none">
      {/* Zone 1: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
          3D
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-100">
              AetherFrame 3D
            </span>
            <span className="text-xs text-slate-400 font-mono">
              // {projectTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: 5-Stage Production Pipeline Switcher */}
      <nav
        aria-label="Production Workflow Stages"
        className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800/90"
      >
        {STAGE_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeStage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectStage(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <span className="font-mono text-[10px] opacity-75">
                0{idx + 1}
              </span>
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Action CTA */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Render MP4 Video</span>
        </button>
      </div>
    </header>
  );
};
