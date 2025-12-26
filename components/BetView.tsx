import React, { useState, useEffect } from "react";
import { supabase } from "@/services/supabaseClient"; //
import { Session } from "@supabase/supabase-js";
import {
  ShieldCheck,
  Users,
  LogOut,
  Loader2,
  UserPlus,
  UserMinus,
  Terminal,
  Crown,
  Swords,
  Server,
} from "lucide-react";

// Tipos
export interface SteamUser {
  steamId: string;
  personaname: string;
  avatarfull: string;
  userId: string; // Necesitamos el ID interno de Supabase para lógica
}

type Phase = "QUEUE" | "VOTING" | "PICKING" | "READY";

export const BetView: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SteamUser | null>(null);

  // Estados del Juego
  const [phase, setPhase] = useState<Phase>("QUEUE");
  const [matchState, setMatchState] = useState<any>(null);

  // Listas de datos
  const [queue, setQueue] = useState<SteamUser[]>([]);
  const [rosterSurvivors, setRosterSurvivors] = useState<SteamUser[]>([]);
  const [rosterInfected, setRosterInfected] = useState<SteamUser[]>([]);
  const [votes, setVotes] = useState<
    { voter_id: string; voted_for_id: string }[]
  >([]);

  // Auxiliares UI
  const [isJoining, setIsJoining] = useState(false);

  // --- 1. INICIALIZACIÓN Y REALTIME ---
  useEffect(() => {
    // Cargar sesión
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => handleSessionUpdate(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) =>
      handleSessionUpdate(session)
    );

    // Cargar Estado Inicial
    fetchMatchState();
    fetchQueue();
    fetchVotes();
    fetchRosters();

    // SUSCRIPCIÓN GLOBAL A TODO (Queue, State, Votes, Rosters)
    const channel = supabase
      .channel("global-game-state")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        // Refresco "bruto" para simplificar sincronización
        if (payload.table === "lobby_queue") fetchQueue();
        if (payload.table === "match_state") fetchMatchState();
        if (payload.table === "match_votes") fetchVotes();
        if (payload.table === "match_rosters") fetchRosters();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // --- 2. LOGICA DE DATOS ---

  const handleSessionUpdate = (session: Session | null) => {
    setSession(session);
    if (session?.user?.user_metadata) {
      setUser({
        steamId: session.user.user_metadata.steam_id,
        personaname: session.user.user_metadata.full_name,
        avatarfull: session.user.user_metadata.avatar_url,
        userId: session.user.id,
      });
    } else {
      setUser(null);
    }
  };

  const fetchMatchState = async () => {
    const { data } = await supabase.from("match_state").select("*").single();
    if (data) {
      setPhase(data.phase);
      setMatchState(data);

      // AUTO-TRIGGER: Si la cola está llena y seguimos en QUEUE, pasar a VOTING
      // (Esto idealmente se hace en backend, lo simulo aquí)
      if (data.phase === "QUEUE") checkQueueFull();
    }
  };

  // Esta es la función que faltaba
  const checkQueueFull = async () => {
    // Consultamos directamente a la BD para tener el dato más fresco
    const { count } = await supabase
      .from("lobby_queue")
      .select("*", { count: "exact", head: true });

    // Si ya hay 8 jugadores, avanzamos a la siguiente fase
    if ((count || 0) >= 8) {
      advanceToVoting();
    }
  };

  const fetchQueue = async () => {
    const { data } = await supabase
      .from("lobby_queue")
      .select("*")
      .order("joined_at");
    if (data) {
      const mapped = data.map((row: any) => ({
        steamId: row.steam_id,
        personaname: row.nickname,
        avatarfull: row.avatar_url,
        userId: row.user_id,
      }));
      setQueue(mapped);
      // Verificar si llenamos para cambiar de fase
      if (mapped.length === 8) advanceToVoting();
    }
  };

  const fetchVotes = async () => {
    const { data } = await supabase.from("match_votes").select("*");
    if (data) setVotes(data);
  };

  const fetchRosters = async () => {
    const { data } = await supabase.from("match_rosters").select("*");
    if (data) {
      setRosterSurvivors(
        data.filter((p: any) => p.team === "SURVIVORS").map(mapRosterToUser)
      );
      setRosterInfected(
        data.filter((p: any) => p.team === "INFECTED").map(mapRosterToUser)
      );
    }
  };

  const mapRosterToUser = (row: any) => ({
    steamId: row.steam_id,
    personaname: row.nickname,
    avatarfull: row.avatar_url,
    userId: row.user_id,
  });

  // --- 3. TRANSICIONES DE ESTADO (GAMEPLAY) ---

  const advanceToVoting = async () => {
    // Solo el último en unirse triggeréa esto para evitar spam, o chequeo de fase actual
    const { data } = await supabase
      .from("match_state")
      .select("phase")
      .single();
    if (data?.phase === "QUEUE") {
      await supabase
        .from("match_state")
        .update({ phase: "VOTING" })
        .eq("phase", "QUEUE");
    }
  };

  const castVote = async (candidateId: string) => {
    if (!session) return;
    await supabase.from("match_votes").insert({
      voter_id: session.user.id,
      voted_for_id: candidateId,
    });

    // Checar si todos votaron (8 votos)
    // Nota: Esto tiene race-conditions en frontend, pero sirve para el ejemplo.
    // Lo correcto es un Trigger de Postgres.
    const { count } = await supabase
      .from("match_votes")
      .select("*", { count: "exact", head: true });
    if ((count || 0) + 1 >= 8) {
      finalizeVoting();
    }
  };

  const finalizeVoting = async () => {
    // Calcular ganadores (Simplificado: Primeros 2 random para demo si hay empate)
    // En producción: Usar RPC function
    const { data: allVotes } = await supabase
      .from("match_votes")
      .select("voted_for_id");
    // ... lógica de conteo ...
    // Asumamos que el backend o el ultimo voto decide.
    // Para este demo, asignamos capitanes arbitrarios de la cola para que veas el flujo:
    const cap1 = queue[0];
    const cap2 = queue[1];

    await supabase
      .from("match_state")
      .update({
        phase: "PICKING",
        captain_survivor_id: cap1.userId,
        captain_infected_id: cap2.userId,
        current_picker_id: cap1.userId, // Empiezan Survivors
      })
      .eq("id", matchState.id);
  };

  const pickPlayer = async (
    player: SteamUser,
    team: "SURVIVORS" | "INFECTED"
  ) => {
    // Validar turno
    if (matchState.current_picker_id !== session?.user.id)
      return alert("Not your turn!");

    // 1. Añadir a roster
    await supabase.from("match_rosters").insert({
      user_id: player.userId,
      steam_id: player.steamId,
      nickname: player.personaname,
      avatar_url: player.avatarfull,
      team: team,
    });

    // 2. Quitar de la Queue (visual) o marcar como "picked"
    // Para simplificar, usaremos la queue y filtraremos los que ya están en rosters.

    // 3. Cambiar turno
    const nextPicker =
      team === "SURVIVORS"
        ? matchState.captain_infected_id
        : matchState.captain_survivor_id;

    // Checar si ya acabamos (8 jugadores asignados)
    const totalPicked = rosterSurvivors.length + rosterInfected.length + 1;

    if (totalPicked >= 8) {
      await supabase
        .from("match_state")
        .update({
          phase: "READY",
          server_ip: "connect 192.168.1.50:27015; password mix", // IP Demo
        })
        .eq("id", matchState.id);
    } else {
      await supabase
        .from("match_state")
        .update({ current_picker_id: nextPicker })
        .eq("id", matchState.id);
    }
  };

  // --- 4. ACCIONES BASICAS ---
  const handleJoinQueue = async () => {
    if (!user || !session) return;
    setIsJoining(true);
    await supabase.from("lobby_queue").insert({
      user_id: session.user.id,
      steam_id: user.steamId,
      nickname: user.personaname,
      avatar_url: user.avatarfull,
    });
    setIsJoining(false);
  };

  const handleLeaveQueue = async () => {
    if (!session) return;
    await supabase.from("lobby_queue").delete().eq("user_id", session.user.id);
  };

  const handleLogin = () =>
    (window.location.href =
      "https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1/steam-auth?action=login");
  const handleLogout = async () => await supabase.auth.signOut();

  // --- 5. RENDERIZADO POR FASES ---

  // Helpers de estado
  const isInQueue = user && queue.some((p) => p.steamId === user.steamId);
  const myVote = votes.find((v) => v.voter_id === session?.user.id);
  const isMyTurn = session?.user.id === matchState?.current_picker_id;
  const isSurvivorCap = session?.user.id === matchState?.captain_survivor_id;
  const isInfectedCap = session?.user.id === matchState?.captain_infected_id;

  // Render: HEADER COMÚN
  const renderHeader = () => (
    <div className="flex justify-between items-end border-b border-white/10 pb-8 mb-8">
      <div>
        <div className="flex items-center gap-3 text-zinc-500 text-[10px] tracking-[0.4em] uppercase mb-2">
          <Terminal size={14} />
          <span>Op. System: {phase}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase">
          {phase} PHASE
        </h1>
      </div>
      {user ? (
        <div className="flex items-center gap-4">
          <img
            src={user.avatarfull}
            className="w-10 h-10 border border-white/20"
          />
          <button onClick={handleLogout}>
            <LogOut className="text-zinc-500 hover:text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="bg-[#1b2838] px-4 py-2 text-white font-bold text-xs tracking-widest uppercase"
        >
          Steam Login
        </button>
      )}
    </div>
  );

  // Render: VISTA DE COLA (QUEUE)
  if (phase === "QUEUE") {
    return (
      <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen">
        {renderHeader()}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => {
            const p = queue[i];
            return (
              <div
                key={i}
                className={`aspect-square border flex flex-col items-center justify-center p-4 ${
                  p ? "bg-zinc-900 border-green-500/30" : "border-white/5"
                }`}
              >
                {p ? (
                  <>
                    <img src={p.avatarfull} className="w-16 h-16 mb-2" />
                    <span className="text-white font-bold text-xs">
                      {p.personaname}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-700 text-xs">EMPTY</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-center">
          {!isInQueue ? (
            <button
              onClick={handleJoinQueue}
              disabled={queue.length >= 8}
              className="bg-white text-black px-8 py-3 font-black tracking-widest uppercase hover:bg-gray-200"
            >
              Join Queue
            </button>
          ) : (
            <button
              onClick={handleLeaveQueue}
              className="border border-red-500 text-red-500 px-8 py-3 font-black tracking-widest uppercase hover:bg-red-500 hover:text-white"
            >
              Leave Queue
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render: VISTA DE VOTACIÓN
  if (phase === "VOTING") {
    return (
      <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen">
        {renderHeader()}
        <div className="text-center mb-8 text-green-400 font-mono text-sm tracking-widest animate-pulse">
          VOTE FOR CAPTAINS
        </div>
        <div className="grid grid-cols-4 gap-6">
          {queue.map((p) => {
            const votesReceived = votes.filter(
              (v) => v.voted_for_id === p.userId
            ).length;
            return (
              <div
                key={p.steamId}
                className="bg-zinc-900 border border-white/10 p-6 flex flex-col items-center group relative"
              >
                <img
                  src={p.avatarfull}
                  className="w-20 h-20 mb-4 rounded-none grayscale group-hover:grayscale-0 transition-all"
                />
                <div className="text-white font-black text-sm uppercase mb-4">
                  {p.personaname}
                </div>
                <div className="text-xs text-zinc-500 mb-4">
                  {votesReceived} Votes
                </div>
                {!myVote && p.userId !== session?.user.id && (
                  <button
                    onClick={() => castVote(p.userId)}
                    className="border border-white/20 hover:bg-white hover:text-black text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all"
                  >
                    VOTE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render: VISTA DE SELECCIÓN (PICKING)
  if (phase === "PICKING") {
    // Filtrar jugadores disponibles (Los que están en Queue pero NO en Rosters)
    const pickedIds = [...rosterSurvivors, ...rosterInfected].map(
      (u) => u.steamId
    );
    const availablePlayers = queue.filter(
      (p) =>
        !pickedIds.includes(p.steamId) &&
        p.userId !== matchState.captain_survivor_id &&
        p.userId !== matchState.captain_infected_id
    );

    return (
      <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen">
        {renderHeader()}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team Survivors */}
          <div className="border border-blue-500/30 bg-blue-900/10 p-4">
            <h3 className="text-blue-400 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
              <ShieldCheck /> Survivors
            </h3>
            <div className="space-y-2">
              {rosterSurvivors.map((p) => (
                <div
                  key={p.steamId}
                  className="flex items-center gap-2 bg-black/40 p-2 border-l-2 border-blue-500"
                >
                  <img src={p.avatarfull} className="w-6 h-6" />{" "}
                  <span className="text-white text-xs">{p.personaname}</span>
                </div>
              ))}
              {/* Placeholder para Capitan si aun no se autoselecciona, en este demo asumimos que capitanes no juegan o se autoagregan */}
            </div>
          </div>

          {/* Pool Central */}
          <div className="border border-white/10 p-4">
            <div className="text-center mb-4 text-[10px] text-zinc-500 uppercase tracking-widest">
              {isMyTurn ? (
                <span className="text-green-400 animate-pulse">
                  YOUR TURN TO PICK
                </span>
              ) : (
                "WAITING FOR CAPTAIN..."
              )}
            </div>
            <div className="space-y-2">
              {availablePlayers.map((p) => (
                <div
                  key={p.steamId}
                  className="flex justify-between items-center bg-zinc-900 p-3 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <img src={p.avatarfull} className="w-8 h-8" />
                    <span className="text-white text-xs font-bold">
                      {p.personaname}
                    </span>
                  </div>
                  {isMyTurn && (
                    <button
                      onClick={() =>
                        pickPlayer(p, isSurvivorCap ? "SURVIVORS" : "INFECTED")
                      }
                      className="bg-white text-black px-2 py-1 text-[9px] font-black uppercase hover:bg-green-400"
                    >
                      PICK
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team Infected */}
          <div className="border border-red-500/30 bg-red-900/10 p-4">
            <h3 className="text-red-400 font-black tracking-widest uppercase mb-4 flex items-center gap-2">
              <Swords /> Infected
            </h3>
            <div className="space-y-2">
              {rosterInfected.map((p) => (
                <div
                  key={p.steamId}
                  className="flex items-center gap-2 bg-black/40 p-2 border-l-2 border-red-500"
                >
                  <img src={p.avatarfull} className="w-6 h-6" />{" "}
                  <span className="text-white text-xs">{p.personaname}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render: VISTA FINAL (READY)
  if (phase === "READY") {
    return (
      <div className="pt-32 px-6 max-w-7xl mx-auto min-h-screen text-center">
        <h1 className="text-6xl font-black text-green-500 uppercase mb-4 tracking-tighter">
          MATCH READY
        </h1>
        <div className="bg-zinc-900 border border-green-500/50 p-8 max-w-2xl mx-auto mb-12">
          <div className="text-zinc-500 text-xs tracking-widest uppercase mb-2">
            Server Connection Protocol
          </div>
          <div className="font-mono text-2xl text-white select-all bg-black p-4 border border-white/10 flex items-center justify-center gap-3">
            <Server size={20} className="text-green-500" />
            {matchState.server_ip}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div>
            <h2 className="text-blue-400 font-black text-2xl uppercase mb-4">
              Survivors
            </h2>
            {rosterSurvivors.map((p) => (
              <div
                key={p.steamId}
                className="text-white py-2 border-b border-white/5"
              >
                {p.personaname}
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-red-400 font-black text-2xl uppercase mb-4">
              Infected
            </h2>
            {rosterInfected.map((p) => (
              <div
                key={p.steamId}
                className="text-white py-2 border-b border-white/5"
              >
                {p.personaname}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white pt-32 text-center">
      <Loader2 className="animate-spin mx-auto" /> Loading System...
    </div>
  );
};
