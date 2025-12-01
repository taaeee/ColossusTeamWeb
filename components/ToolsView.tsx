import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Crosshair,
  Sun,
  Eye,
  Activity,
  Sliders,
  Monitor,
} from "lucide-react";

type ToolTab = "crosshair" | "glows";

export const ToolsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolTab>("crosshair");

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-4">
          TACTICAL TOOLS
        </h1>
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs tracking-widest uppercase">
          <Sliders size={12} />
          <span>Game Configuration Utilities</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-16">
        <button
          onClick={() => setActiveTab("crosshair")}
          className={`px-8 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-300 border flex items-center gap-3 ${
            activeTab === "crosshair"
              ? "bg-white text-black border-white"
              : "bg-zinc-900/50 text-zinc-500 hover:text-white border-white/10 hover:border-white/30"
          }`}
        >
          <Crosshair size={14} />
          Crosshair Editor
        </button>
        <button
          onClick={() => setActiveTab("glows")}
          className={`px-8 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-300 border flex items-center gap-3 ${
            activeTab === "glows"
              ? "bg-white text-black border-white"
              : "bg-zinc-900/50 text-zinc-500 hover:text-white border-white/10 hover:border-white/30"
          }`}
        >
          <Sun size={14} />
          Glows Editor
        </button>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === "crosshair" ? <CrosshairEditor /> : <GlowsEditor />}
      </div>
    </div>
  );
};

// --- CROSSHAIR EDITOR ---

const CrosshairEditor: React.FC = () => {
  const [config, setConfig] = useState({
    red: 255,
    green: 0,
    blue: 255,
    thickness: 3,
    dynamic: true,
  });
  const [copied, setCopied] = useState(false);

  const cssCrosshairColor = `rgb(${config.red}, ${config.green}, ${config.blue})`;

  // Output code for config file
  const generatedCode = `cl_crosshair_red ${config.red}
cl_crosshair_green ${config.green}
cl_crosshair_blue ${config.blue}
cl_crosshair_thickness ${config.thickness}
cl_crosshair_dynamic ${config.dynamic ? "1" : "0"}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CSS Variables for the visualizer to handle dynamic updates cleanly
  const styleVars = {
    "--th": `${config.thickness}px`,
    "--len": "12px",
    "--gap": "5px",
    "--spread": "12px",
    "--col": cssCrosshairColor,
    "--shadow": `0 0 4px ${cssCrosshairColor}`,
  } as React.CSSProperties;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main Editor Area (Visualizer + Settings) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Visualizer */}
        <div className="border border-white/10 bg-black h-[400px] relative overflow-hidden flex items-center justify-center group">
          {/* Background Simulation */}
          <div className="absolute inset-0 bg-[url('https://picsum.photos/800/800?grayscale')] opacity-20 bg-cover bg-center" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80" />

          {/* The Crosshair Container */}
          <div className="relative w-full h-full" style={styleVars}>
            {/* Top Bar */}
            <div
              className={`absolute w-(--th) h-(--len) bg-(--col) left-1/2 top-1/2 -translate-x-1/2 origin-bottom shadow-(--shadow) ${
                config.dynamic ? "animate-spread-top" : ""
              }`}
              style={{ transform: "translate(-50%, calc(-100% - var(--gap)))" }}
            />

            {/* Bottom Bar */}
            <div
              className={`absolute w-(--th) h-(--len) bg-(--col) left-1/2 top-1/2 -translate-x-1/2 origin-top shadow-(--shadow) ${
                config.dynamic ? "animate-spread-bottom" : ""
              }`}
              style={{ transform: "translate(-50%, var(--gap))" }}
            />

            {/* Left Bar */}
            <div
              className={`absolute w-(--len) h-(--th) bg-(--col) left-6/12 top-1/2 -translate-y-1/2 origin-right shadow-(--shadow) ${
                config.dynamic ? "animate-spread-left" : ""
              }`}
              style={{ transform: "translate(calc(-100% - var(--gap)), -50%)" }}
            />

            {/* Right Bar */}
            <div
              className={`absolute w-(--len) h-(--th) bg-(--col) left-1/2 top-1/2 -translate-y-1/2 origin-left shadow-(--shadow) ${
                config.dynamic ? "animate-spread-right" : ""
              }`}
              style={{ transform: "translate(var(--gap), -50%)" }}
            />
          </div>

          <div className="absolute bottom-4 left-4 text-[10px] tracking-widest text-zinc-500 uppercase flex items-center gap-2">
            <Monitor size={12} /> Preview (L4D2)
          </div>
        </div>

        {/* Controls */}
        <div className="border border-white/10 bg-zinc-900/30 p-8 backdrop-blur-sm">
          <h3 className="text-xl font-light tracking-tight text-white flex items-center gap-2 mb-8">
            SETTINGS
          </h3>

          {/* Colors */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest uppercase text-zinc-500">
                <span>Red</span>
                <span className="text-white">{config.red}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.red}
                onChange={(e) =>
                  setConfig({ ...config, red: Number(e.target.value) })
                }
                className="w-full h-1 bg-red-900 rounded-lg appearance-none cursor-pointer accent-red-500 hover:opacity-100 opacity-80 transition-opacity"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest uppercase text-zinc-500">
                <span>Green</span>
                <span className="text-white">{config.green}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.green}
                onChange={(e) =>
                  setConfig({ ...config, green: Number(e.target.value) })
                }
                className="w-full h-1 bg-green-900 rounded-lg appearance-none cursor-pointer accent-green-500 hover:opacity-100 opacity-80 transition-opacity"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest uppercase text-zinc-500">
                <span>Blue</span>
                <span className="text-white">{config.blue}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={config.blue}
                onChange={(e) =>
                  setConfig({ ...config, blue: Number(e.target.value) })
                }
                className="w-full h-1 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:opacity-100 opacity-80 transition-opacity"
              />
            </div>
          </div>

          <div className="h-px bg-white/5 my-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Thickness */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest uppercase text-zinc-500">
                <span>Thickness</span>
                <span className="text-white">{config.thickness}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={config.thickness}
                onChange={(e) =>
                  setConfig({ ...config, thickness: Number(e.target.value) })
                }
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-300"
              />
            </div>

            {/* Dynamic */}
            <div
              className="flex items-center justify-between group cursor-pointer border border-white/5 p-4 rounded hover:bg-white/5 transition-colors"
              onClick={() => setConfig({ ...config, dynamic: !config.dynamic })}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white tracking-wide">
                  Dynamic Crosshair
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Expands on movement
                </span>
              </div>
              <div
                className={`w-12 h-6 rounded-full border border-white/10 relative transition-colors duration-300 ${
                  config.dynamic ? "bg-white" : "bg-transparent"
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-3.5 h-3.5 rounded-full transition-transform duration-300 ${
                    config.dynamic ? "translate-x-6 bg-black" : "bg-zinc-500"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output Area */}
      <div className="lg:col-span-4">
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between bg-zinc-900/50 border border-white/10 border-b-0 p-3">
            <span className="text-[10px] tracking-widest uppercase text-zinc-500">
              Autoexec Output
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              {copied ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? "Copied" : "Copy All"}
            </button>
          </div>
          <textarea
            readOnly
            value={generatedCode}
            className="flex-1 w-full bg-zinc-950 border border-white/10 p-4 text-xs font-mono text-zinc-400 resize-none focus:outline-none leading-relaxed min-h-[500px] lg:min-h-0"
          />
        </div>
      </div>

      <style>{`
        @keyframes spread-top {
          0%, 100% { transform: translate(-50%, calc(-100% - var(--gap))); }
          50% { transform: translate(-50%, calc(-100% - var(--gap) - var(--spread))); }
        }
        @keyframes spread-bottom {
          0%, 100% { transform: translate(-50%, var(--gap)); }
          50% { transform: translate(-50%, calc(var(--gap) + var(--spread))); }
        }
        @keyframes spread-left {
          0%, 100% { transform: translate(calc(-100% - var(--gap)), -50%); }
          50% { transform: translate(calc(-100% - var(--gap) - var(--spread)), -50%); }
        }
        @keyframes spread-right {
          0%, 100% { transform: translate(var(--gap), -50%); }
          50% { transform: translate(calc(var(--gap) + var(--spread)), -50%); }
        }
        
        .animate-spread-top { animation: spread-top 1.5s ease-in-out infinite; }
        .animate-spread-bottom { animation: spread-bottom 1.5s ease-in-out infinite; }
        .animate-spread-left { animation: spread-left 1.5s ease-in-out infinite; }
        .animate-spread-right { animation: spread-right 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

// --- GLOWS EDITOR ---

interface GlowEntity {
  id: string;
  label: string;
  cvar: string;
  description: string;
}

const ENTITIES: GlowEntity[] = [
  {
    id: "survivor",
    label: "Survivors",
    cvar: "survivor",
    description: "Teammate outlines",
  },
  {
    id: "infected",
    label: "Infected",
    cvar: "infected",
    description: "Common infected (usually restrictive)",
  },
  {
    id: "ghost",
    label: "Ghost Infected",
    cvar: "ghost_infected",
    description: "Teammates in ghost spawn mode",
  },
  {
    id: "special",
    label: "Special Infected",
    cvar: "infected_vomit",
    description: "Active specials (Boomeed)",
  },
  {
    id: "item",
    label: "Items",
    cvar: "item",
    description: "Weapons and pills nearby",
  },
  {
    id: "item_far",
    label: "Far Items",
    cvar: "item_far",
    description: "Items at a distance",
  },
];

const GlowsEditor: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<string>("survivor");
  const [glows, setGlows] = useState<
    Record<string, { r: number; g: number; b: number }>
  >(() => {
    // Initialize all with default cyan
    const initial: any = {};
    ENTITIES.forEach((e) => (initial[e.id] = { r: 50, g: 150, b: 255 }));
    return initial;
  });
  const [copied, setCopied] = useState(false);

  const currentGlow = glows[selectedEntity];

  const updateColor = (key: "r" | "g" | "b", val: number) => {
    setGlows((prev) => ({
      ...prev,
      [selectedEntity]: { ...prev[selectedEntity], [key]: val },
    }));
  };

  // L4D2 uses normalized float values (0.0 to 1.0)
  const normalize = (val: number) => (val / 255).toFixed(3);

  const generateCode = () => {
    return ENTITIES.map((ent) => {
      const color = glows[ent.id];
      const base = `cl_glow_${ent.cvar}`;
      return `${base}_r ${normalize(color.r)}\n${base}_g ${normalize(
        color.g
      )}\n${base}_b ${normalize(color.b)}`;
    }).join("\n\n");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Entity List */}
      <div className="lg:col-span-3 space-y-2">
        {ENTITIES.map((ent) => (
          <button
            key={ent.id}
            onClick={() => setSelectedEntity(ent.id)}
            className={`w-full text-left px-4 py-4 border transition-all duration-300 group ${
              selectedEntity === ent.id
                ? "bg-white text-black border-white"
                : "bg-zinc-900/30 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
            }`}
          >
            <div className="text-xs font-bold tracking-widest uppercase mb-1">
              {ent.label}
            </div>
            <div
              className={`text-[10px] ${
                selectedEntity === ent.id
                  ? "text-zinc-500"
                  : "text-zinc-600 group-hover:text-zinc-500"
              }`}
            >
              {ent.description}
            </div>
          </button>
        ))}
      </div>

      {/* Editor Area */}
      <div className="lg:col-span-5 space-y-6">
        {/* Preview */}
        <div className="border border-white/10 bg-zinc-950 p-12 flex flex-col items-center justify-center relative overflow-hidden h-[300px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,50,50,0.2)_0%,transparent_70%)]" />

          {/* The Silhouette */}
          <div className="relative z-10">
            <Activity
              size={120}
              color="white"
              style={{
                filter: `drop-shadow(0 0 15px rgb(${currentGlow.r}, ${currentGlow.g}, ${currentGlow.b})) drop-shadow(0 0 5px rgb(${currentGlow.r}, ${currentGlow.g}, ${currentGlow.b}))`,
              }}
            />
          </div>
          <div className="mt-8 text-xs tracking-widest text-zinc-500 uppercase">
            Glow Intensity Preview
          </div>
        </div>

        {/* Sliders */}
        <div className="border border-white/10 bg-zinc-900/30 p-8 backdrop-blur-sm space-y-6">
          {["r", "g", "b"].map((channel) => (
            <div key={channel} className="space-y-2">
              <div className="flex justify-between text-xs tracking-widest uppercase text-zinc-500">
                <span>
                  {channel === "r" ? "Red" : channel === "g" ? "Green" : "Blue"}
                </span>
                <span className="text-white">
                  {currentGlow[channel as "r" | "g" | "b"]}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={currentGlow[channel as "r" | "g" | "b"]}
                onChange={(e) =>
                  updateColor(
                    channel as "r" | "g" | "b",
                    Number(e.target.value)
                  )
                }
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer hover:opacity-100 opacity-80 transition-opacity ${
                  channel === "r"
                    ? "bg-red-900 accent-red-500"
                    : channel === "g"
                    ? "bg-green-900 accent-green-500"
                    : "bg-blue-900 accent-blue-500"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Code Output */}
      <div className="lg:col-span-4">
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between bg-zinc-900/50 border border-white/10 border-b-0 p-3">
            <span className="text-[10px] tracking-widest uppercase text-zinc-500">
              Autoexec Output
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              {copied ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? "Copied" : "Copy All"}
            </button>
          </div>
          <textarea
            readOnly
            value={generateCode()}
            className="flex-1 w-full bg-zinc-950 border border-white/10 p-4 text-xs font-mono text-zinc-400 resize-none focus:outline-none leading-relaxed min-h-[500px]"
          />
        </div>
      </div>
    </div>
  );
};
