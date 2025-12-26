import React, { useState, useEffect } from "react";
import { SteamUser } from "../types";
import { supabase } from "@/services/supabaseClient";
import { Session } from "@supabase/supabase-js";
import {
  ShieldCheck,
  Users,
  LogOut,
  Loader2,
  UserPlus,
  UserMinus,
  Terminal,
} from "lucide-react";

interface BetViewProps {}

// Mock players to populate the queue initially
const MOCK_GHOST_PLAYERS: Partial<SteamUser>[] = [
  {
    steamId: "ghost-1",
    personaname: "VOID_PROTOCOL",
    avatarfull: "https://picsum.photos/100/100?random=10",
  },
  {
    steamId: "ghost-2",
    personaname: "ECHO_SYSTEM",
    avatarfull: "https://picsum.photos/100/100?random=11",
  },
  {
    steamId: "ghost-3",
    personaname: "FLUX_NODE",
    avatarfull: "https://picsum.photos/100/100?random=12",
  },
];

export const BetView: React.FC<BetViewProps> = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SteamUser | null>(null);
  const [queue, setQueue] = useState<Partial<SteamUser>[]>(MOCK_GHOST_PLAYERS);
  const [isJoining, setIsJoining] = useState(false);

  // Manage Supabase session and convert to SteamUser
  useEffect(() => {
    // 1. Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata) {
        const steamUser: SteamUser = {
          steamId: session.user.user_metadata.steam_id,
          personaname: session.user.user_metadata.full_name,
          avatarfull: session.user.user_metadata.avatar_url,
          profileurl: session.user.user_metadata.profile_url || "",
        };
        setUser(steamUser);
      }
    });

    // 2. Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata) {
        const steamUser: SteamUser = {
          steamId: session.user.user_metadata.steam_id,
          personaname: session.user.user_metadata.full_name,
          avatarfull: session.user.user_metadata.avatar_url,
          profileurl: session.user.user_metadata.profile_url || "",
        };
        setUser(steamUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isInQueue = user && queue.some((p) => p.steamId === user.steamId);
  const isFull = queue.length >= 8;

  const handleJoinQueue = () => {
    if (!user || isInQueue || isFull) return;
    setIsJoining(true);
    // Simulate tactical delay
    setTimeout(() => {
      setQueue((prev) => [...prev, user]);
      setIsJoining(false);
    }, 800);
  };

  const handleLeaveQueue = () => {
    if (!user || !isInQueue) return;
    setQueue((prev) => prev.filter((p) => p.steamId !== user.steamId));
  };

  const handleLogin = () => {
    const authUrl =
      "https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1/steam-auth?action=login";
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Tactical Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-3 text-zinc-500 text-[10px] tracking-[0.4em] uppercase mb-2">
            <Terminal size={14} />
            <span>Operational System: Enrollment</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase">
            Queue
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
              Queue Status
            </div>
            <div className="text-2xl font-mono text-white flex items-center gap-3">
              <span
                className={queue.length === 8 ? "text-green-500" : "text-white"}
              >
                {queue.length}
              </span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-700">08</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Bar */}
      {user ? (
        <div className="flex flex-col md:flex-row items-center justify-between p-4 border border-white/20 bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.avatarfull}
                alt={user.personaname}
                className="w-12 h-12 rounded-none border border-white/20"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 border-2 border-obsidian"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white uppercase">
                {user.personaname}
              </h2>
              <div className="flex items-center gap-2 text-zinc-500 text-[9px] tracking-widest uppercase mt-0.5">
                <ShieldCheck size={10} className="text-blue-400" />
                <span>Verified Combatant</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest mb-0.5">
                Deployment Status
              </span>
              <div className="text-white font-mono text-lg uppercase">
                {isInQueue ? "Deployed" : "Standby"}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden md:block" />

            {isInQueue ? (
              <button
                onClick={handleLeaveQueue}
                className="flex items-center gap-2 px-6 py-2 border border-red-500/50 text-red-500 text-[10px] font-black tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all"
              >
                <UserMinus size={14} />
                Leave Queue
              </button>
            ) : (
              <button
                onClick={handleJoinQueue}
                disabled={isFull || isJoining}
                className="flex items-center gap-2 px-6 py-2 bg-white text-black text-[10px] font-black tracking-widest uppercase hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                {isFull ? "Queue Full" : "Join Queue"}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 border border-white/5 text-zinc-600 hover:text-white transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border border-white/10 bg-zinc-900/10">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={24} className="text-zinc-700" />
          </div>
          <h2 className="text-xl font-light tracking-tight text-white mb-2 uppercase">
            Authentication Required
          </h2>
          <p className="text-zinc-500 text-[10px] mb-8 text-center max-w-xs tracking-widest leading-loose">
            IDENTITY VERIFICATION THROUGH STEAM IS MANDATORY FOR QUEUE
            ENROLLMENT.
          </p>
          <button
            onClick={handleLogin}
            className="flex items-center gap-4 bg-[#1b2838] hover:bg-[#2a3f5a] text-white px-8 py-3 transition-all duration-300 border border-white/5 group shadow-[0_0_40px_rgba(0,0,0,0.5)]"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg"
              className="w-5 h-5 invert"
              alt="Steam"
            />
            <span className="text-[10px] tracking-[0.3em] font-black uppercase">
              Steam Login
            </span>
          </button>
        </div>
      )}

      {/* 8-Player Grid */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-600 text-[10px] tracking-widest font-bold uppercase">
            <Users size={14} />
            <span>Tactical Enrollment Grid</span>
          </div>
          {isFull && (
            <div className="text-[10px] text-green-500 font-bold tracking-[0.2em] animate-pulse">
              PROTOCOL READY: COMMENCING MATCH
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => {
            const player = queue[index];
            return (
              <div
                key={index}
                className={`relative aspect-square border transition-all duration-500 flex flex-col items-center justify-center p-4 overflow-hidden
                    ${
                      player
                        ? "bg-zinc-900/40 border-white/20"
                        : "bg-black/20 border-white/5 group"
                    }
                `}
              >
                {player ? (
                  <>
                    <img
                      src={player.avatarfull}
                      className="w-20 h-20 mb-4 border border-white/10 grayscale group-hover:grayscale-0 transition-all"
                      alt="Player"
                    />
                    <div className="text-[10px] font-black tracking-widest text-white uppercase text-center truncate w-full">
                      {player.personaname}
                    </div>
                    <div className="absolute top-2 left-2 text-[8px] text-zinc-700 font-mono">
                      0{index + 1}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 border border-dashed border-white/10 flex items-center justify-center mb-4 animate-pulse">
                      <Users size={20} className="text-zinc-800" />
                    </div>
                    <div className="text-[8px] text-zinc-700 tracking-[0.3em] font-bold uppercase">
                      Searching...
                    </div>
                    <div className="absolute inset-0 bg-linear-to-t from-zinc-900/20 to-transparent pointer-events-none" />

                    {/* Scanning Animation for empty slots */}
                    <div className="absolute top-0 left-0 w-full h-px bg-white/5 animate-scan pointer-events-none" />
                  </>
                )}

                {/* Tactical Corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/10" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/10" />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            50% { opacity: 0.5; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
            animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
};
