import React, { useState, useEffect } from "react";
// Asegúrate de que este import apunte a tu configuración real de Supabase
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

// Tipos adaptados para mantener compatibilidad con tu UI
export interface SteamUser {
  steamId: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

interface BetViewProps {}

export const BetView: React.FC<BetViewProps> = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SteamUser | null>(null);

  // El estado queue ahora empieza vacío, esperando datos reales
  const [queue, setQueue] = useState<SteamUser[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  // 1. Manejo de Sesión (Login/Logout/Usuario actual)
  useEffect(() => {
    // Verificar sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionUpdate(session);
    });

    // Escuchar cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionUpdate(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función auxiliar para procesar la sesión
  const handleSessionUpdate = (session: Session | null) => {
    setSession(session);
    if (session?.user?.user_metadata) {
      setUser({
        steamId: session.user.user_metadata.steam_id,
        personaname: session.user.user_metadata.full_name,
        avatarfull: session.user.user_metadata.avatar_url,
        profileurl: session.user.user_metadata.profile_url || "",
      });
    } else {
      setUser(null);
    }
  };

  // 2. Lógica de la Cola (Realtime + Fetch Inicial)
  useEffect(() => {
    // Cargar estado inicial
    fetchQueue();

    // Suscribirse a cambios en tiempo real en la tabla 'lobby_queue'
    const channel = supabase
      .channel("lobby-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobby_queue" },
        (payload) => {
          console.log("Cambio en el lobby detectado:", payload);
          // Refrescamos la lista completa para asegurar sincronización
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Función para obtener la lista de jugadores y adaptarla a tu interfaz
  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from("lobby_queue")
      .select("*")
      .order("joined_at", { ascending: true }); // Orden de llegada

    if (error) {
      console.error("Error fetching queue:", error);
      return;
    }

    if (data) {
      // MAPEO CRÍTICO: De columnas DB -> A tu tipo SteamUser
      const formattedQueue: SteamUser[] = data.map((row: any) => ({
        steamId: row.steam_id,
        personaname: row.nickname,
        avatarfull: row.avatar_url,
        profileurl: "", // La DB no guarda esto por ahora, pero no afecta visualmente
      }));
      setQueue(formattedQueue);
    }
  };

  // Verificamos si el usuario actual está en la lista (comparando SteamIDs)
  const isInQueue = user && queue.some((p) => p.steamId === user.steamId);
  const isFull = queue.length >= 8;

  // 3. Acciones del Usuario
  const handleJoinQueue = async () => {
    if (!user || isInQueue || isFull || !session) return;
    setIsJoining(true);

    try {
      const { error } = await supabase.from("lobby_queue").insert({
        user_id: session.user.id, // ID interno de Supabase para RLS
        steam_id: user.steamId,
        nickname: user.personaname,
        avatar_url: user.avatarfull,
      });

      if (error) throw error;
      // No necesitamos actualizar 'queue' manualmente aquí,
      // el evento Realtime disparará fetchQueue() automáticamente.
    } catch (error: any) {
      console.error("Error uniéndose:", error.message);
      alert("Error al unirse: " + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user || !isInQueue || !session) return;

    try {
      // Borramos basándonos en el user_id de supabase (seguro gracias a RLS)
      const { error } = await supabase
        .from("lobby_queue")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saliendo:", error.message);
    }
  };

  const handleLogin = () => {
    // IMPORTANTE: Asegúrate de que esta URL sea la correcta de tu Edge Function pública
    // y que tengas configurada la redirect URL a localhost o tu dominio en Supabase
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
              <span className="text-zinc-700">8</span>
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
                <span>{user.steamId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <div className="flex flex-col items-end mr-4">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest mb-0.5">
                Status
              </span>
              <div className="text-white font-mono text-lg uppercase">
                {isInQueue ? (
                  <span className="text-green-400">In Queue</span>
                ) : (
                  <span className="text-yellow-500">Standby</span>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden md:block" />

            {isInQueue ? (
              <button
                onClick={handleLeaveQueue}
                className="flex items-center gap-2 px-6 py-2 border border-red-500/50 text-red-500 text-[10px] font-black tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all cursor-pointer"
              >
                <UserMinus size={14} />
                Leave Queue
              </button>
            ) : (
              <button
                onClick={handleJoinQueue}
                disabled={isFull || isJoining}
                className="flex items-center gap-2 px-6 py-2 bg-white text-black text-[10px] font-black tracking-widest uppercase hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
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
              onClick={() => {
                handleLeaveQueue();
                handleLogout();
              }}
              className="p-2 border border-white/5 text-zinc-600 hover:text-white transition-all cursor-pointer"
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
            className="flex items-center gap-4 bg-[#1b2838] hover:bg-[#2a3f5a] text-white px-8 py-3 transition-all duration-300 border border-white/5 group shadow-[0_0_40px_rgba(0,0,0,0.5)] cursor-pointer"
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
            <span>Players in queue</span>
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
                      className="w-20 h-20 mb-4 border border-white/10"
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
