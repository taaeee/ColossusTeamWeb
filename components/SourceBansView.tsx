import React, { useEffect, useState } from "react";
import { SourceServer } from "@/types";

import {
  Server,
  Map,
  Users,
  Gamepad2,
  Globe,
  ExternalLink,
  Clock,
} from "lucide-react";

export const SourceBansView: React.FC = () => {
  const [servers, setServers] = useState<SourceServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/server-status")
      .then((r) => r.json())
      .then((data) => setServers([data]))
      .catch(() => setServers(null));
    const firstOnline = servers.find((s) => s.status === "online");
    if (firstOnline) setSelectedServer(firstOnline.id);
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen animate-in fade-in duration-500">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-4">
          SERVER BROWSER
        </h1>
        <div className="flex items-center gap-2 text-zinc-500 text-xs tracking-widest uppercase">
          <Server size={12} />
          <span>Available Servers</span>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden bg-black/40 backdrop-blur-sm">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-900/80 border-b border-white/10 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          <div className="col-span-6 md:col-span-5">Server Name</div>
          <div className="col-span-3 md:col-span-3 hidden md:block">Map</div>
          <div className="col-span-3 md:col-span-2 hidden md:block">Mode</div>
          <div className="col-span-6 md:col-span-2 text-right">Players</div>
        </div>

        {/* List */}
        <div>
          {servers?.map((server) => {
            const isSelected = selectedServer === server.id;
            const isOnline = server.status === "online";

            return (
              <div key={server.id} className="flex flex-col">
                {/* Main Row */}
                <div
                  onClick={() =>
                    setSelectedServer(isSelected ? null : server.id)
                  }
                  className={`grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer transition-colors border-b border-white/5 items-center
                                ${
                                  isSelected
                                    ? "bg-zinc-900/60"
                                    : "hover:bg-zinc-900/30"
                                }
                            `}
                >
                  <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isOnline
                          ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                          : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium truncate ${
                        isOnline ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {server.name}
                    </span>
                  </div>
                  <div className="col-span-3 md:col-span-3 hidden md:block text-xs text-zinc-400 flex items-center gap-2">
                    <Map size={12} /> {server.map}
                  </div>
                  <div className="col-span-3 md:col-span-2 hidden md:block text-xs text-zinc-400 flex items-center gap-2">
                    <Gamepad2 size={12} /> {server.mode}
                  </div>
                  <div className="col-span-6 md:col-span-2 text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded border ${
                        isOnline
                          ? "text-green-400 border-green-900/30 bg-green-900/10"
                          : "text-red-900 border-red-900/20 bg-red-900/5"
                      }`}
                    >
                      {isOnline
                        ? `${server.players}/${server.maxPlayers}`
                        : "Offline"}
                    </span>
                  </div>
                </div>

                {/* Expanded Details - The "Blue Box" from screenshot */}
                {isSelected && (
                  <div className="bg-[#0f172a] border-y border-blue-900/30 p-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                            Server Name
                          </div>
                          <div className="text-xl text-white font-bold">
                            {server.name}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                            Address
                          </div>
                          <div className="text-sm text-blue-200 font-mono select-all bg-blue-950/30 inline-block px-2 py-1 rounded border border-blue-900/30">
                            {server.address}:{server.port}
                          </div>
                        </div>

                        <div className="pt-2">
                          {isOnline ? (
                            <a
                              href={`steam://connect/${server.address}:${server.port}`}
                              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Join Server <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                              Server Unreachable
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                            Current Map
                          </div>
                          <div className="text-white text-sm">{server.map}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                            Game Mode
                          </div>
                          <div className="text-white text-sm">
                            {server.mode}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                            Players
                          </div>
                          <div className="text-white text-sm">
                            {server.players} / {server.maxPlayers}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
                            Status
                          </div>
                          <div
                            className={`text-xs font-bold uppercase inline-block px-2 py-0.5 rounded ${
                              isOnline
                                ? "bg-green-900/30 text-green-400"
                                : "bg-red-900/30 text-red-400"
                            }`}
                          >
                            {server.status}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Players - Styled matching screenshot */}
                    <div className="mt-12 pt-8 border-t border-white/5">
                      <div className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mb-6 font-bold">
                        Current Players
                      </div>

                      {isOnline &&
                      server.playerList &&
                      server.playerList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4">
                          {server.playerList.map((player, id) => (
                            <div
                              key={id}
                              className="flex items-center justify-between group/player py-1"
                            >
                              <span className="text-sm font-bold text-white tracking-tight group-hover/player:text-blue-200 transition-colors">
                                {player.name}
                              </span>
                              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-white/5 group-hover/player:border-white/10 transition-colors">
                                <Clock size={12} className="text-zinc-600" />
                                <span className="text-xs text-zinc-400 font-medium">
                                  {player.time}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-600 italic font-light">
                          {server.players === 0
                            ? "The server is currently empty."
                            : "Encryption active. Player list hidden."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
