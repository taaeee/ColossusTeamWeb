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

// Tipos para el sistema de pick-up
interface MatchState {
  id: string;
  phase: "QUEUE" | "VOTING" | "PICKING" | "READY";
  voting_round?: "SURVIVOR" | "INFECTED";
  captain_survivor_id?: string;
  captain_infected_id?: string;
  current_picker_id?: string;
  server_ip?: string;
  voting_end_time?: string; // Timestamp para sincronizar timer entre clientes
  updated_at?: string;
}

interface Vote {
  id: string;
  voter_id: string;
  voted_for_id: string;
}

interface Roster {
  id: string;
  user_id: string;
  steam_id: string;
  nickname: string;
  avatar_url: string;
  team: "SURVIVORS" | "INFECTED" | null;
}

interface BetViewProps {}

export const BetView: React.FC<BetViewProps> = () => {
  // Configuración de jugadores máximos
  const MAX_PLAYERS = 2;

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SteamUser | null>(null);

  // El estado queue ahora empieza vacío, esperando datos reales
  const [queue, setQueue] = useState<SteamUser[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  // Estados para el sistema de pick-up
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [votingTimeLeft, setVotingTimeLeft] = useState<number>(20);
  const [serverIP, setServerIP] = useState<string>("");

  // Estados para features avanzadas
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [captainSelectionMethod, setCaptainSelectionMethod] = useState<{
    survivor: "voted" | "random" | "tie";
    infected: "voted" | "random" | "tie";
  }>({ survivor: "voted", infected: "voted" });

  // Mapeo de user_id a steam_id para poder contar votos correctamente
  const [userIdToSteamId, setUserIdToSteamId] = useState<{
    [key: string]: string;
  }>({});

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

  // 3. Suscripciones a las tablas del sistema de pick-up
  useEffect(() => {
    // Fetch inicial del estado de la partida
    fetchMatchState();
    fetchVotes();
    fetchRosters();

    // Suscripción a match_state
    const matchChannel = supabase
      .channel("match-state-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_state" },
        () => {
          fetchMatchState();
        }
      )
      .subscribe();

    // Suscripción a match_votes
    const votesChannel = supabase
      .channel("match-votes-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_votes" },
        (payload) => {
          console.log("🔔 Vote change detected:", payload.eventType);
          fetchVotes();
        }
      )
      .subscribe();

    // Suscripción a match_rosters
    const rostersChannel = supabase
      .channel("match-rosters-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_rosters" },
        () => {
          fetchRosters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(rostersChannel);
    };
  }, []);

  // 4. Verificar si el usuario actual es admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("admins")
        .select("steam_id")
        .eq("steam_id", user.steamId)
        .single();

      if (error) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    };

    checkAdmin();
  }, [user]);

  // 5. Detectar cuando un jugador se desconecta
  useEffect(() => {
    if (!session && user) {
      // Usuario se desconectó
      handlePlayerLeave();
    }
  }, [session, user]);

  const handlePlayerLeave = async () => {
    if (!matchState) return;

    try {
      if (matchState.phase === "QUEUE") {
        // Simplemente remover de la cola
        // El useEffect de lobby_queue ya maneja esto
        return;
      }

      if (matchState.phase === "VOTING") {
        // Remover votos del jugador y continuar
        if (session?.user?.id) {
          await supabase
            .from("match_votes")
            .delete()
            .eq("voter_id", session.user.id);
        }
        return;
      }

      if (matchState.phase === "PICKING" || matchState.phase === "READY") {
        // Abortar partida si alguien sale durante picking o ready
        await abortMatch(
          "Un jugador se desconectó. La partida ha sido abortada."
        );
      }
    } catch (error) {
      console.error("Error handling player leave:", error);
    }
  };

  const abortMatch = async (reason: string) => {
    alert(reason);

    // Limpiar todo y volver a QUEUE
    await supabase
      .from("match_rosters")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("match_votes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { data } = await supabase.from("match_state").select("id").single();
    if (data) {
      await supabase
        .from("match_state")
        .update({
          phase: "QUEUE",
          voting_round: null,
          captain_survivor_id: null,
          captain_infected_id: null,
          current_picker_id: null,
          server_ip: null,
        })
        .eq("id", data.id);
    }
  };

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

      // Crear mapeo de user_id a steam_id
      const mapping: { [key: string]: string } = {};
      data.forEach((row: any) => {
        mapping[row.user_id] = row.steam_id;
      });
      setUserIdToSteamId(mapping);
    }
  };

  // Función para obtener el estado de la partida
  const fetchMatchState = async () => {
    const { data, error } = await supabase
      .from("match_state")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      // Ignorar error si no hay filas
      console.error("Error fetching match state:", error);
      return;
    }

    if (data) {
      setMatchState(data as MatchState);
    }
  };

  // Función para obtener los votos
  const fetchVotes = async () => {
    console.log("🔍 Fetching votes from database...");
    const { data, error } = await supabase.from("match_votes").select("*");

    if (error) {
      console.error("❌ Error fetching votes:", error);
      return;
    }

    if (data) {
      console.log("✅ Votes fetched:", data.length, "votes");
      console.log("   Data:", data);
      setVotes(data as Vote[]);
    } else {
      console.log("⚠️ No vote data returned");
    }
  };

  // Función para obtener los rosters
  const fetchRosters = async () => {
    const { data, error } = await supabase.from("match_rosters").select("*");

    if (error) {
      console.error("Error fetching rosters:", error);
      return;
    }

    if (data) {
      setRosters(data as Roster[]);
    }
  };

  // Verificamos si el usuario actual está en la lista (comparando SteamIDs)
  const isInQueue = user && queue.some((p) => p.steamId === user.steamId);
  const isFull = queue.length >= MAX_PLAYERS;

  const handleJoinQueue = async () => {
    if (!user || isInQueue || isFull || !session) return;
    setIsJoining(true);

    try {
      // Use upsert to prevent duplicates
      const { error } = await supabase.from("lobby_queue").upsert(
        {
          user_id: session.user.id, // ID interno de Supabase para RLS
          steam_id: user.steamId,
          nickname: user.personaname,
          avatar_url: user.avatarfull,
        },
        {
          onConflict: "steam_id", // Upsert based on steam_id
        }
      );

      if (error) throw error;
    } catch (error: any) {
      console.error("Error uniéndose:", error.message);
      alert("Error al unirse: " + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user || !isInQueue || !session) return;

    // FIX #1: No permitir salir durante partida activa
    if (matchState && matchState.phase !== "QUEUE") {
      alert("No puedes salir de la cola durante una partida activa");
      console.log("Leave blocked - active match in phase:", matchState.phase);
      return;
    }

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
    // First, remove user from queue if they're in it
    if (isInQueue && session) {
      try {
        await supabase
          .from("lobby_queue")
          .delete()
          .eq("user_id", session.user.id);
      } catch (error: any) {
        console.error("Error leaving queue on logout:", error.message);
      }
    }

    // Then sign out
    await supabase.auth.signOut();
  };

  // 4. Lógica de transición de fases
  // Detectar cuando la cola se llena y transicionar a VOTING
  useEffect(() => {
    // FIX #2: Logging extensivo para debugging
    console.log("=== PHASE TRANSITION CHECK ===");
    console.log("Queue length:", queue.length, "/ Max:", MAX_PLAYERS);
    console.log("Current phase:", matchState?.phase);
    console.log(
      "Should transition?",
      queue.length === MAX_PLAYERS && matchState?.phase === "QUEUE"
    );

    if (queue.length === MAX_PLAYERS && matchState?.phase === "QUEUE") {
      console.log("🚀 TRIGGERING TRANSITION TO VOTING");
      transitionToVoting();
    }
  }, [queue.length, matchState?.phase, MAX_PLAYERS]);

  // Timer de votación - sincronizado con timestamp
  useEffect(() => {
    if (matchState?.phase === "VOTING" && matchState.voting_end_time) {
      const interval = setInterval(() => {
        const now = Date.now();
        const endTime = new Date(matchState.voting_end_time!).getTime();
        const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));

        setVotingTimeLeft(secondsLeft);

        if (secondsLeft === 0) {
          clearInterval(interval);
          console.log("⏰ Timer expired, calling backend for transition...");

          // Call Edge Function for server-side transition
          (async () => {
            try {
              const { data, error } = await supabase.functions.invoke(
                "voting-transition"
              );
              if (error) {
                console.error("❌ Edge Function error:", error);
              } else {
                console.log("✅ Backend transition response:", data);
              }
            } catch (err) {
              console.error("❌ Failed to call Edge Function:", err);
            }
          })();
        }
      }, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [
    matchState?.phase,
    matchState?.voting_end_time,
    matchState?.voting_round,
  ]);

  // Funciones de transición
  const transitionToVoting = async () => {
    try {
      console.log("=== TRANSITION TO VOTING ===");

      const { data: stateData } = await supabase
        .from("match_state")
        .select("id")
        .single();

      if (stateData) {
        // IMPORTANTE: Limpiar TODOS los datos de match anteriores
        console.log("Cleaning previous match data...");

        // Limpiar rosters
        await supabase
          .from("match_rosters")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        console.log("✅ Rosters cleared");

        // Limpiar votos
        await supabase
          .from("match_votes")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        console.log("✅ Votes cleared");

        // Resetear match_state completamente y establecer timestamp de fin de votación
        const votingEndTime = new Date(Date.now() + 20000).toISOString(); // 20 segundos
        await supabase
          .from("match_state")
          .update({
            phase: "VOTING",
            voting_round: "SURVIVOR",
            captain_survivor_id: null,
            captain_infected_id: null,
            current_picker_id: null,
            voting_end_time: votingEndTime,
          })
          .eq("id", stateData.id);
        console.log("✅ Match state reset for voting");
        console.log("⏰ Voting will end at:", votingEndTime);
      }

      setVotingTimeLeft(20);
    } catch (error) {
      console.error("Error transitioning to voting:", error);
    }
  };

  const transitionToInfectedVoting = async () => {
    try {
      // FIX CRÍTICO: Fetch fresh votes from DB instead of using stale state from closure
      console.log("=== TRANSITION TO INFECTED VOTING ===");
      console.log("Fetching FRESH votes from database...");

      const { data: freshVotes, error: votesError } = await supabase
        .from("match_votes")
        .select("*");

      if (votesError) {
        console.error("❌ Error fetching fresh votes:", votesError);
        return;
      }

      const currentVotes = freshVotes || [];
      console.log("Fresh votes count:", currentVotes.length);
      console.log("All votes:", currentVotes);
      console.log("UserID to SteamID mapping:", userIdToSteamId);
      console.log("Queue:", queue);

      // Contar votos y determinar capitán Survivor con fallback
      const voteCounts: { [key: string]: number } = {};
      currentVotes.forEach((vote) => {
        console.log("Processing vote:", JSON.stringify(vote));
        console.log(`  voter_id: "${vote.voter_id}"`);
        console.log(`  voted_for_id: "${vote.voted_for_id}"`);
        console.log(`  Current voteCounts before:`, voteCounts);

        voteCounts[vote.voted_for_id] =
          (voteCounts[vote.voted_for_id] || 0) + 1;

        console.log(`  Current voteCounts after:`, voteCounts);
      });

      console.log("Vote counts:", voteCounts);

      let survivorCaptainId: string;
      let selectionMethod: "voted" | "random" | "tie" = "voted";

      if (Object.keys(voteCounts).length === 0) {
        // NO VOTES - Selección aleatoria
        console.log("⚠️ NO VOTES CAST - Using random selection");
        const randomIndex = Math.floor(Math.random() * queue.length);
        const randomPlayer = queue[randomIndex];
        const userId = Object.keys(userIdToSteamId).find(
          (uid) => userIdToSteamId[uid] === randomPlayer.steamId
        );
        survivorCaptainId = userId || queue[randomIndex].steamId;
        selectionMethod = "random";
        console.log("Random Survivor captain:", survivorCaptainId);
      } else {
        const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
        const topVoteCount = sorted[0][1];
        const tiedCandidates = sorted.filter(
          ([_, count]) => count === topVoteCount
        );

        if (tiedCandidates.length > 1) {
          // TIE - Selección aleatoria de los empatados
          console.log("⚠️ VOTE TIE - Breaking randomly");
          const randomIndex = Math.floor(Math.random() * tiedCandidates.length);
          survivorCaptainId = tiedCandidates[randomIndex][0];
          selectionMethod = "tie";
          console.log(
            "Tied candidates:",
            tiedCandidates,
            "Selected:",
            survivorCaptainId
          );
        } else {
          survivorCaptainId = sorted[0][0];
          console.log(
            "✅ Voted Survivor captain:",
            survivorCaptainId,
            "with",
            sorted[0][1],
            "votes"
          );
        }
      }

      // Actualizar método de selección
      setCaptainSelectionMethod((prev) => ({
        ...prev,
        survivor: selectionMethod,
      }));

      const { data: stateData } = await supabase
        .from("match_state")
        .select("id")
        .single();

      if (stateData) {
        // Establecer timestamp para la segunda ronda de votación
        const votingEndTime = new Date(Date.now() + 20000).toISOString();

        await supabase
          .from("match_state")
          .update({
            voting_round: "INFECTED",
            captain_survivor_id: survivorCaptainId,
            voting_end_time: votingEndTime,
          })
          .eq("id", stateData.id);

        console.log("⏰ Infected voting will end at:", votingEndTime);
      }

      // Limpiar votos para la siguiente ronda
      console.log("Clearing Survivor voting round votes...");
      await supabase
        .from("match_votes")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("✅ Votes cleared for Infected voting round");

      setVotingTimeLeft(20);
    } catch (error) {
      console.error("Error transitioning to infected voting:", error);
    }
  };

  const transitionToPicking = async () => {
    try {
      // FIX CRÍTICO: Fetch fresh votes from DB instead of using stale state from closure
      console.log("=== TRANSITION TO PICKING ===");
      console.log("Fetching FRESH votes from database...");

      const { data: freshVotes, error: votesError } = await supabase
        .from("match_votes")
        .select("*");

      if (votesError) {
        console.error("❌ Error fetching fresh votes:", votesError);
        return;
      }

      const currentVotes = freshVotes || [];
      console.log("Fresh votes count:", currentVotes.length);
      console.log("All votes:", currentVotes);
      console.log("UserID to SteamID mapping:", userIdToSteamId);

      // Contar votos y determinar capitán Infected con fallback
      const voteCounts: { [key: string]: number } = {};
      currentVotes.forEach((vote) => {
        console.log(
          `  Vote: voter=${vote.voter_id} -> voted_for=${vote.voted_for_id}`
        );
        voteCounts[vote.voted_for_id] =
          (voteCounts[vote.voted_for_id] || 0) + 1;
      });

      console.log("Vote counts:", voteCounts);

      let infectedCaptainId: string;
      let selectionMethod: "voted" | "random" | "tie" = "voted";

      if (Object.keys(voteCounts).length === 0) {
        // NO VOTES - Selección aleatoria
        console.log("⚠️ NO VOTES CAST - Using random selection");
        const randomIndex = Math.floor(Math.random() * queue.length);
        const randomPlayer = queue[randomIndex];
        const userId = Object.keys(userIdToSteamId).find(
          (uid) => userIdToSteamId[uid] === randomPlayer.steamId
        );
        infectedCaptainId = userId || queue[randomIndex].steamId;
        selectionMethod = "random";
        console.log("Random Infected captain:", infectedCaptainId);
      } else {
        const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
        const topVoteCount = sorted[0][1];
        const tiedCandidates = sorted.filter(
          ([_, count]) => count === topVoteCount
        );

        if (tiedCandidates.length > 1) {
          // TIE - Selección aleatoria de los empatados
          console.log("⚠️ VOTE TIE - Breaking randomly");
          const randomIndex = Math.floor(Math.random() * tiedCandidates.length);
          infectedCaptainId = tiedCandidates[randomIndex][0];
          selectionMethod = "tie";
          console.log(
            "Tied candidates:",
            tiedCandidates,
            "Selected:",
            infectedCaptainId
          );
        } else {
          infectedCaptainId = sorted[0][0];
          console.log(
            "✅ Voted Infected captain:",
            infectedCaptainId,
            "with",
            sorted[0][1],
            "votes"
          );
        }
      }

      // Actualizar método de selección
      setCaptainSelectionMethod((prev) => ({
        ...prev,
        infected: selectionMethod,
      }));

      const { data: stateData } = await supabase
        .from("match_state")
        .select("*")
        .single();

      if (stateData) {
        // IMPORTANTE: Verificar que el Infected captain sea diferente del Survivor captain
        if (infectedCaptainId === stateData.captain_survivor_id) {
          console.warn(
            "⚠️ Same player selected for both captains! Selecting different player..."
          );
          // Buscar un jugador diferente
          const availablePlayers = queue.filter((p) => {
            const userId = Object.keys(userIdToSteamId).find(
              (uid) => userIdToSteamId[uid] === p.steamId
            );
            return userId && userId !== stateData.captain_survivor_id;
          });

          if (availablePlayers.length > 0) {
            const randomPlayer =
              availablePlayers[
                Math.floor(Math.random() * availablePlayers.length)
              ];
            const userId = Object.keys(userIdToSteamId).find(
              (uid) => userIdToSteamId[uid] === randomPlayer.steamId
            );
            infectedCaptainId = userId || infectedCaptainId;
            console.log(
              "✅ Selected different Infected captain:",
              infectedCaptainId,
              "(",
              randomPlayer.personaname,
              ")"
            );
          }
        }

        await supabase
          .from("match_state")
          .update({
            phase: "PICKING",
            captain_infected_id: infectedCaptainId,
            current_picker_id: stateData.captain_survivor_id, // Survivor picks first
          })
          .eq("id", stateData.id);

        // Limpiar rosters anteriores y añadir capitanes
        await supabase
          .from("match_rosters")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        console.log("Inserting captains into rosters...");
        console.log("Survivor captain ID:", stateData.captain_survivor_id);
        console.log("Infected captain ID:", infectedCaptainId);

        // Buscar datos de los capitanes en la cola usando el mapeo
        const survivorSteamId = userIdToSteamId[stateData.captain_survivor_id];
        const infectedSteamId = userIdToSteamId[infectedCaptainId];

        const survivorCaptain = queue.find(
          (p) => p.steamId === survivorSteamId
        );
        const infectedCaptain = queue.find(
          (p) => p.steamId === infectedSteamId
        );

        console.log("Survivor captain found:", survivorCaptain?.personaname);
        console.log("Infected captain found:", infectedCaptain?.personaname);

        if (survivorCaptain) {
          await supabase.from("match_rosters").insert({
            user_id: stateData.captain_survivor_id,
            steam_id: survivorCaptain.steamId,
            nickname: survivorCaptain.personaname,
            avatar_url: survivorCaptain.avatarfull,
            team: "SURVIVORS",
          });
          console.log("✅ Survivor captain inserted into roster");
        } else {
          console.error("❌ Survivor captain not found in queue");
        }

        if (infectedCaptain) {
          await supabase.from("match_rosters").insert({
            user_id: infectedCaptainId,
            steam_id: infectedCaptain.steamId,
            nickname: infectedCaptain.personaname,
            avatar_url: infectedCaptain.avatarfull,
            team: "INFECTED",
          });
          console.log("✅ Infected captain inserted into roster");
        } else {
          console.error("❌ Infected captain not found in queue");
        }
      }
    } catch (error) {
      console.error("Error transitioning to picking:", error);
    }
  };

  const transitionToReady = async () => {
    try {
      // Obtener IP del servidor
      const response = await fetch("/api/server-status");
      const data = await response.json();
      const serverIp = data.connect || "";

      const { data: stateData } = await supabase
        .from("match_state")
        .select("id")
        .single();

      if (stateData) {
        await supabase
          .from("match_state")
          .update({
            phase: "READY",
            server_ip: serverIp,
          })
          .eq("id", stateData.id);
      }

      setServerIP(serverIp);
    } catch (error) {
      console.error("Error transitioning to ready:", error);
    }
  };

  // Función para votar
  const handleVote = async (playerSteamId: string) => {
    if (!session) return;

    console.log("=== HANDLE VOTE ===");
    console.log("Voting for player (steamId):", playerSteamId);
    console.log("Current voting round:", matchState?.voting_round);

    try {
      // Buscar el user_id del jugador votado en la tabla lobby_queue
      const { data: playerData, error: lookupError } = await supabase
        .from("lobby_queue")
        .select("user_id")
        .eq("steam_id", playerSteamId)
        .single();

      if (lookupError || !playerData) {
        console.error("❌ Error finding player:", lookupError);
        return;
      }

      console.log("✅ Found player user_id:", playerData.user_id);

      // Eliminar voto anterior si existe
      await supabase
        .from("match_votes")
        .delete()
        .eq("voter_id", session.user.id);

      // Insertar nuevo voto con el user_id correcto
      await supabase.from("match_votes").insert({
        voter_id: session.user.id,
        voted_for_id: playerData.user_id,
      });

      console.log("✅ Vote registered successfully");
    } catch (error) {
      console.error("❌ Error voting:", error);
    }
  };

  // Función para seleccionar jugador (picking phase)
  const handlePick = async (playerId: string) => {
    // FIX #5: Logging extensivo para debugging picking
    console.log("=== HANDLE PICK ===");
    console.log("Current user ID:", session?.user?.id);
    console.log("Match state:", matchState);
    console.log("Current picker ID:", matchState?.current_picker_id);
    console.log(
      "Is my turn?",
      matchState?.current_picker_id === session?.user?.id
    );
    console.log("Player to pick (steamId):", playerId);
    console.log("Current rosters:", rosters);

    if (!session || !matchState) {
      console.log("❌ No session or matchState");
      return;
    }

    if (matchState.current_picker_id !== session.user.id) {
      console.log("❌ Not your turn!");
      console.log("  Expected:", matchState.current_picker_id);
      console.log("  Your ID:", session.user.id);
      return;
    }

    const pickedCount = rosters.filter((r) => r.team).length;
    console.log("Picked count:", pickedCount);

    let team: "SURVIVORS" | "INFECTED";

    // Determinar equipo según orden de draft: S(1) → I(2) → S(2) → I(1)
    if (pickedCount === 2) team = "SURVIVORS"; // S picks 1
    else if (pickedCount >= 3 && pickedCount <= 4)
      team = "INFECTED"; // I picks 2
    else if (pickedCount >= 5 && pickedCount <= 6)
      team = "SURVIVORS"; // S picks 2
    else team = "INFECTED"; // I picks 1

    console.log("Assigning to team:", team);

    try {
      const player = queue.find((p) => p.steamId === playerId);
      if (!player) {
        console.log("❌ Player not found in queue");
        return;
      }

      // Buscar el user_id del jugador en lobby_queue
      const { data: playerData, error: lookupError } = await supabase
        .from("lobby_queue")
        .select("user_id")
        .eq("steam_id", playerId)
        .single();

      if (lookupError || !playerData) {
        console.error("❌ Error finding player for picking:", lookupError);
        return;
      }

      console.log("✅ Found player user_id:", playerData.user_id);

      await supabase.from("match_rosters").insert({
        user_id: playerData.user_id,
        steam_id: player.steamId,
        nickname: player.personaname,
        avatar_url: player.avatarfull,
        team,
      });

      // Determinar próximo picker
      let nextPicker = matchState.current_picker_id;
      if (pickedCount === 2)
        nextPicker = matchState.captain_infected_id; // After S(1), I picks
      else if (pickedCount === 4)
        nextPicker = matchState.captain_survivor_id; // After I(2), S picks
      else if (pickedCount === 6) nextPicker = matchState.captain_infected_id; // After S(2), I picks

      const { data: stateData } = await supabase
        .from("match_state")
        .select("id")
        .single();

      if (stateData) {
        await supabase
          .from("match_state")
          .update({ current_picker_id: nextPicker })
          .eq("id", stateData.id);
      }

      // Si completamos todos los picks, transicionar a READY
      if (pickedCount >= 7) {
        transitionToReady();
      }
    } catch (error) {
      console.error("Error picking player:", error);
    }
  };

  // Funciones de override admin
  const forcePhaseTransition = async (
    targetPhase: "VOTING" | "PICKING" | "READY"
  ) => {
    if (!isAdmin) return;

    // FIX #4: Assign random captains when skipping to PICKING/READY
    console.log("=== ADMIN FORCE PHASE ===");
    console.log("Target phase:", targetPhase);

    try {
      const { data } = await supabase.from("match_state").select("*").single();
      if (!data) return;

      let updates: any = { phase: targetPhase };

      // Limpiar datos si se fuerza VOTING
      if (targetPhase === "VOTING") {
        console.log("Cleaning data for forced VOTING phase...");

        // Limpiar rosters
        await supabase
          .from("match_rosters")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        // Limpiar votos
        await supabase
          .from("match_votes")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        // Resetear captain IDs y establecer timestamp
        const votingEndTime = new Date(Date.now() + 20000).toISOString();
        updates.voting_round = "SURVIVOR";
        updates.captain_survivor_id = null;
        updates.captain_infected_id = null;
        updates.current_picker_id = null;
        updates.voting_end_time = votingEndTime;

        console.log("✅ Data cleaned for VOTING");
        console.log("⏰ Voting will end at:", votingEndTime);
      }

      // Solo asignar capitanes aleatorios al saltar a PICKING
      if (targetPhase === "PICKING") {
        if (queue.length >= 2) {
          // Obtener 2 jugadores aleatorios diferentes como capitanes
          const shuffled = [...queue].sort(() => Math.random() - 0.5);
          const survivor = shuffled[0];
          const infected = shuffled[1]; // Garantizado diferente porque shuffled tiene todos los jugadores

          // Find their user_ids
          const survivorUserId = Object.keys(userIdToSteamId).find(
            (uid) => userIdToSteamId[uid] === survivor.steamId
          );
          const infectedUserId = Object.keys(userIdToSteamId).find(
            (uid) => userIdToSteamId[uid] === infected.steamId
          );

          updates.captain_survivor_id = survivorUserId;
          updates.captain_infected_id = infectedUserId;
          updates.current_picker_id = survivorUserId; // Survivor picks first

          console.log("Assigned random captains:");
          console.log(
            "  Survivor:",
            survivorUserId,
            "(",
            survivor.personaname,
            ")"
          );
          console.log(
            "  Infected:",
            infectedUserId,
            "(",
            infected.personaname,
            ")"
          );
          console.log("  Current picker:", survivorUserId);
        } else {
          console.warn("Not enough players in queue for captains");
        }
      }

      await supabase.from("match_state").update(updates).eq("id", data.id);
      console.log("✅ Phase transition complete");

      // Si saltamos a PICKING, insertar capitanes en rosters (igual que el flujo secuencial)
      if (
        targetPhase === "PICKING" &&
        updates.captain_survivor_id &&
        updates.captain_infected_id
      ) {
        console.log("Inserting captains into rosters (admin skip)...");

        // Limpiar rosters anteriores
        await supabase
          .from("match_rosters")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        // Buscar datos de los capitanes en la cola usando el mapeo
        const survivorSteamId = userIdToSteamId[updates.captain_survivor_id];
        const infectedSteamId = userIdToSteamId[updates.captain_infected_id];

        const survivorCaptain = queue.find(
          (p) => p.steamId === survivorSteamId
        );
        const infectedCaptain = queue.find(
          (p) => p.steamId === infectedSteamId
        );

        console.log("Survivor captain found:", survivorCaptain?.personaname);
        console.log("Infected captain found:", infectedCaptain?.personaname);

        if (survivorCaptain) {
          await supabase.from("match_rosters").insert({
            user_id: updates.captain_survivor_id,
            steam_id: survivorCaptain.steamId,
            nickname: survivorCaptain.personaname,
            avatar_url: survivorCaptain.avatarfull,
            team: "SURVIVORS",
          });
          console.log("✅ Survivor captain inserted into roster");
        }

        if (infectedCaptain) {
          await supabase.from("match_rosters").insert({
            user_id: updates.captain_infected_id,
            steam_id: infectedCaptain.steamId,
            nickname: infectedCaptain.personaname,
            avatar_url: infectedCaptain.avatarfull,
            team: "INFECTED",
          });
          console.log("✅ Infected captain inserted into roster");
        }
      }
    } catch (error) {
      console.error("❌ Error forcing phase transition:", error);
    }
  };

  const handleAdminReset = async () => {
    if (
      !isAdmin ||
      !confirm("¿Resetear toda la partida? Esto borrará todos los datos.")
    )
      return;

    // FIX #4: Better cleanup logic
    console.log("=== ADMIN RESET ===");

    try {
      // 1. Clear all tables in correct order using gte instead of neq
      console.log("Clearing match_rosters...");
      await supabase
        .from("match_rosters")
        .delete()
        .gte("id", "00000000-0000-0000-0000-000000000000");

      console.log("Clearing match_votes...");
      await supabase
        .from("match_votes")
        .delete()
        .gte("id", "00000000-0000-0000-0000-000000000000");

      console.log("Clearing lobby_queue...");
      await supabase
        .from("lobby_queue")
        .delete()
        .gte("id", "00000000-0000-0000-0000-000000000000");

      // 2. Reset match_state
      console.log("Resetting match_state...");
      const { data } = await supabase.from("match_state").select("id").single();
      if (data) {
        await supabase
          .from("match_state")
          .update({
            phase: "QUEUE",
            voting_round: null,
            captain_survivor_id: null,
            captain_infected_id: null,
            current_picker_id: null,
            server_ip: null,
          })
          .eq("id", data.id);
      }

      console.log("✅ Admin reset complete");
      alert("Partida reseteada exitosamente");
    } catch (error) {
      console.error("❌ Admin reset error:", error);
      alert("Error al resetear: " + error);
    }
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
                className={
                  queue.length === MAX_PLAYERS ? "text-green-500" : "text-white"
                }
              >
                {queue.length}
              </span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-700">{MAX_PLAYERS}</span>
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

      {/* Conditional rendering based on phase */}
      {(!matchState || matchState.phase === "QUEUE") && (
        <>
          {/* 8-Player Grid - QUEUE PHASE */}
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
              {Array.from({ length: MAX_PLAYERS }).map((_, index) => {
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
                        <div className="absolute top-0 left-0 w-full h-px bg-white/5 animate-scan pointer-events-none" />
                      </>
                    )}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/10" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/10" />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* VOTING PHASE */}
      {matchState?.phase === "VOTING" && (
        <div className="flex flex-col gap-6">
          <div className="text-center border border-yellow-500/30 bg-yellow-500/5 p-6">
            <h2 className="text-2xl font-black tracking-tight text-yellow-500 uppercase mb-2">
              {matchState.voting_round === "SURVIVOR"
                ? "🎯 Vote for Survivor Captain"
                : "☣️ Vote for Infected Captain"}
            </h2>
            <div className="text-4xl font-mono text-white mb-2">
              {votingTimeLeft}s
            </div>
            <div className="text-[10px] text-zinc-500 tracking-widest">
              TIME REMAINING
            </div>
          </div>

          {matchState.voting_round === "INFECTED" &&
            matchState.captain_survivor_id && (
              <div className="border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-4">
                <div className="text-green-500 text-sm font-bold tracking-widest">
                  SURVIVOR CAPTAIN:
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={
                      queue.find((p) => {
                        // FIX: Correctly find captain using userIdToSteamId mapping
                        const captainSteamId =
                          userIdToSteamId[matchState.captain_survivor_id!];
                        return p.steamId === captainSteamId;
                      })?.avatarfull || ""
                    }
                    alt="Captain"
                    className="w-10 h-10 border border-green-500/50"
                  />
                  <span className="text-white font-bold">
                    {queue.find((p) => {
                      const captainSteamId =
                        userIdToSteamId[matchState.captain_survivor_id!];
                      return p.steamId === captainSteamId;
                    })?.personaname || "Survivor Captain"}
                  </span>
                </div>
              </div>
            )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {queue
              .filter((player) => {
                // FIX: No mostrar al capitán ya seleccionado en segunda ronda
                if (
                  matchState.voting_round === "INFECTED" &&
                  matchState.captain_survivor_id
                ) {
                  const captainSteamId =
                    userIdToSteamId[matchState.captain_survivor_id];
                  return player.steamId !== captainSteamId;
                }
                return true;
              })
              .map((player, index) => {
                // Contar votos para ESTE jugador específico usando el mapeo
                const voteCount = votes.filter((v) => {
                  // v.voted_for_id es un user_id, necesitamos convertirlo a steam_id
                  const votedForSteamId = userIdToSteamId[v.voted_for_id];
                  return votedForSteamId === player.steamId;
                }).length;

                return (
                  <div
                    key={index}
                    className="relative border border-white/20 bg-zinc-900/40 p-4 flex flex-col items-center gap-2"
                  >
                    <img
                      src={player.avatarfull}
                      className="w-16 h-16 border border-white/10"
                      alt={player.personaname}
                    />
                    <div className="text-[10px] font-bold text-white uppercase text-center truncate w-full">
                      {player.personaname}
                    </div>
                    {voteCount > 0 && (
                      <div className="text-xs text-yellow-500 font-mono">
                        {voteCount} votes
                      </div>
                    )}
                    <button
                      onClick={() => handleVote(player.steamId)}
                      disabled={!session}
                      className="w-full py-1 bg-yellow-500 text-black text-[8px] font-black tracking-widest uppercase hover:bg-yellow-400 transition-all disabled:opacity-50"
                    >
                      VOTE
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* PICKING PHASE */}
      {matchState?.phase === "PICKING" && (
        <div className="flex flex-col gap-6">
          <div className="text-center border border-blue-500/30 bg-blue-500/5 p-4">
            <h2 className="text-xl font-black tracking-tight text-blue-500 uppercase">
              Team Selection in Progress
            </h2>
            <div className="text-[10px] text-zinc-500 mt-2">
              Current Picker:{" "}
              {matchState.current_picker_id === matchState.captain_survivor_id
                ? "Survivor Captain"
                : "Infected Captain"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Survivors Team */}
            <div className="border border-green-500/30 bg-green-500/5 p-6">
              <h3 className="text-lg font-black text-green-500 uppercase mb-4 flex items-center gap-2">
                <span>🎯</span> SURVIVORS
              </h3>
              <div className="space-y-2">
                {rosters
                  .filter((r) => r.team === "SURVIVORS")
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-2 bg-zinc-900/50 border border-white/10"
                    >
                      <img
                        src={player.avatar_url}
                        className="w-10 h-10 border border-white/10"
                        alt={player.nickname}
                      />
                      <div>
                        <div className="text-white font-bold text-sm">
                          {player.nickname}
                        </div>
                        {player.user_id === matchState.captain_survivor_id && (
                          <div className="text-[8px] text-yellow-500 font-bold">
                            ★ CAPTAIN
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Infected Team */}
            <div className="border border-red-500/30 bg-red-500/5 p-6">
              <h3 className="text-lg font-black text-red-500 uppercase mb-4 flex items-center gap-2">
                <span>☣️</span> INFECTED
              </h3>
              <div className="space-y-2">
                {rosters
                  .filter((r) => r.team === "INFECTED")
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-2 bg-zinc-900/50 border border-white/10"
                    >
                      <img
                        src={player.avatar_url}
                        className="w-10 h-10 border border-white/10"
                        alt={player.nickname}
                      />
                      <div>
                        <div className="text-white font-bold text-sm">
                          {player.nickname}
                        </div>
                        {player.user_id === matchState.captain_infected_id && (
                          <div className="text-[8px] text-yellow-500 font-bold">
                            ★ CAPTAIN
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Available Players */}
          <div className="border border-white/20 p-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">
              Available Players
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {queue
                .filter((p) => !rosters.some((r) => r.steam_id === p.steamId))
                .map((player) => (
                  <div
                    key={player.steamId}
                    className="border border-white/10 bg-zinc-900/30 p-3 flex flex-col items-center gap-2"
                  >
                    <img
                      src={player.avatarfull}
                      className="w-12 h-12 border border-white/10"
                      alt={player.personaname}
                    />
                    <div className="text-[10px] text-white font-bold uppercase truncate w-full text-center">
                      {player.personaname}
                    </div>
                    <button
                      onClick={() => handlePick(player.steamId)}
                      disabled={
                        matchState.current_picker_id !== session?.user?.id
                      }
                      className="w-full py-1 bg-blue-500 text-white text-[8px] font-black tracking-widest uppercase hover:bg-blue-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      SELECT
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* READY PHASE */}
      {matchState?.phase === "READY" && (
        <div className="flex flex-col gap-6">
          <div className="text-center border border-green-500/50 bg-green-500/10 p-8">
            <h2 className="text-3xl font-black tracking-tight text-green-500 uppercase mb-2">
              🎮 Match Ready 🎮
            </h2>
            <div className="text-[10px] text-zinc-500 tracking-widest">
              TEAMS LOCKED - SERVER ASSIGNED
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Final Survivors Team */}
            <div className="border-2 border-green-500/50 bg-green-500/5 p-6">
              <h3 className="text-2xl font-black text-green-500 uppercase mb-6 text-center">
                SURVIVORS
              </h3>
              <div className="space-y-3">
                {rosters
                  .filter((r) => r.team === "SURVIVORS")
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-4 p-3 bg-zinc-900/70 border border-green-500/30"
                    >
                      <img
                        src={player.avatar_url}
                        className="w-14 h-14 border-2 border-green-500/50"
                        alt={player.nickname}
                      />
                      <div className="flex-1">
                        <div className="text-white font-black text-lg">
                          {player.nickname}
                        </div>
                        {player.user_id === matchState.captain_survivor_id && (
                          <div className="text-xs text-yellow-500 font-bold">
                            ★ CAPTAIN ★
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Final Infected Team */}
            <div className="border-2 border-red-500/50 bg-red-500/5 p-6">
              <h3 className="text-2xl font-black text-red-500 uppercase mb-6 text-center">
                INFECTED
              </h3>
              <div className="space-y-3">
                {rosters
                  .filter((r) => r.team === "INFECTED")
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-4 p-3 bg-zinc-900/70 border border-red-500/30"
                    >
                      <img
                        src={player.avatar_url}
                        className="w-14 h-14 border-2 border-red-500/50"
                        alt={player.nickname}
                      />
                      <div className="flex-1">
                        <div className="text-white font-black text-lg">
                          {player.nickname}
                        </div>
                        {player.user_id === matchState.captain_infected_id && (
                          <div className="text-xs text-yellow-500 font-bold">
                            ★ CAPTAIN ★
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Server Info */}
          <div className="border-2 border-white/30 bg-zinc-900/50 p-8 text-center">
            <div className="text-[10px] text-zinc-500 tracking-widest uppercase mb-2">
              Server Address
            </div>
            <div className="text-3xl font-mono text-white mb-6">
              {matchState.server_ip || serverIP || "Fetching..."}
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={() =>
                  (window.location.href = `steam://connect/${
                    matchState.server_ip || serverIP
                  }`)
                }
                className="px-8 py-4 bg-green-500 text-black text-sm font-black tracking-widest uppercase hover:bg-green-400 transition-all"
              >
                🎮 CONNECT TO SERVER
              </button>
              <button
                onClick={async () => {
                  // Reset match
                  await supabase
                    .from("match_rosters")
                    .delete()
                    .neq("id", "00000000-0000-0000-0000-000000000000");
                  await supabase
                    .from("match_votes")
                    .delete()
                    .neq("id", "00000000-0000-0000-0000-000000000000");
                  await supabase
                    .from("lobby_queue")
                    .delete()
                    .neq("id", "00000000-0000-0000-0000-000000000000");
                  const { data } = await supabase
                    .from("match_state")
                    .select("id")
                    .single();
                  if (data) {
                    await supabase
                      .from("match_state")
                      .update({
                        phase: "QUEUE",
                        voting_round: null,
                        captain_survivor_id: null,
                        captain_infected_id: null,
                        current_picker_id: null,
                        server_ip: null,
                      })
                      .eq("id", data.id);
                  }
                }}
                className="px-8 py-4 border-2 border-white/20 text-white text-sm font-black tracking-widest uppercase hover:bg-white/10 transition-all"
              >
                🔄 NEW MATCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Control Panel */}
      {isAdmin && (
        <div className="fixed bottom-4 right-4 border-2 border-yellow-500 bg-zinc-900/95 p-4 space-y-2 shadow-2xl z-50">
          <div className="text-yellow-500 text-xs font-bold mb-3 tracking-widest">
            ⚡ ADMIN CONTROLS
          </div>

          <button
            onClick={() => forcePhaseTransition("VOTING")}
            className="w-full py-2 bg-yellow-500 text-black text-[10px] font-black tracking-widest uppercase hover:bg-yellow-400 transition-all"
          >
            Force Start Voting
          </button>

          <button
            onClick={() => forcePhaseTransition("PICKING")}
            className="w-full py-2 bg-blue-500 text-white text-[10px] font-black tracking-widest uppercase hover:bg-blue-400 transition-all"
          >
            Skip to Picking
          </button>

          <button
            onClick={() => forcePhaseTransition("READY")}
            className="w-full py-2 bg-green-500 text-black text-[10px] font-black tracking-widest uppercase hover:bg-green-400 transition-all"
          >
            Skip to Ready
          </button>

          <div className="border-t border-yellow-500/30 my-2"></div>

          <button
            onClick={handleAdminReset}
            className="w-full py-2 bg-red-500 text-white text-[10px] font-black tracking-widest uppercase hover:bg-red-400 transition-all"
          >
            Reset Match
          </button>
        </div>
      )}

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
