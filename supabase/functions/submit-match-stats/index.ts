// Supabase Edge Function: submit-match-stats
// Endpoint para que el servidor envíe estadísticas al finalizar el match

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface PlayerStats {
  steam_id: string;
  user_id: string;
  team: "SURVIVORS" | "INFECTED";
  kills: number;
  deaths: number;
  damage_dealt: number;
  damage_taken: number;
  ff_damage: number;
  headshots: number;
  commons_killed: number;
  si_killed: number;
  tanks_killed: number;
  witches_killed: number;
  pills_used: number;
  medkits_used: number;
  survivor_damage: number;
  hunter_pounces: number;
  hunter_deadstops: number;
  charger_impacts: number;
  smoker_pulls: number;
  boomer_vomits: number;
  jockey_rides: number;
  spitter_hits: number;
}

interface RoundData {
  round_number: number;
  map_name: string;
  survivors_score: number;
  infected_score: number;
  duration_seconds: number;
}

interface MatchStatsPayload {
  match_id: string;
  winner: "SURVIVORS" | "INFECTED" | "TIE";
  final_score_survivors: number;
  final_score_infected: number;
  started_at: string;
  ended_at: string;
  rounds: RoundData[];
  player_stats: PlayerStats[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validar API key del servidor
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar API key
    const { data: keyData, error: keyError } = await supabase
      .from("server_api_keys")
      .select("*")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parsear payload
    const payload: MatchStatsPayload = await req.json();

    console.log("Received match stats:", payload);

    // Validar payload
    if (!payload.match_id || !payload.winner || !payload.player_stats) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener match_state_id
    const { data: matchState, error: matchStateError } = await supabase
      .from("match_state")
      .select("id")
      .eq("server_match_id", payload.match_id)
      .single();

    if (matchStateError || !matchState) {
      console.error("Match state not found:", matchStateError);
      return new Response(JSON.stringify({ error: "Match state not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcular duración
    const startTime = new Date(payload.started_at);
    const endTime = new Date(payload.ended_at);
    const durationSeconds = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000
    );

    // 1. Insertar match_game
    const { data: matchGame, error: gameError } = await supabase
      .from("match_games")
      .insert({
        match_state_id: matchState.id,
        server_match_id: payload.match_id,
        winner: payload.winner,
        total_rounds: payload.rounds?.length || 0,
        final_score_survivors: payload.final_score_survivors,
        final_score_infected: payload.final_score_infected,
        game_mode: "versus",
        config_name: "zonemod",
        started_at: payload.started_at,
        ended_at: payload.ended_at,
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (gameError) {
      console.error("Error inserting match_game:", gameError);
      return new Response(
        JSON.stringify({
          error: "Failed to insert match game",
          details: gameError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Match game inserted:", matchGame.id);

    // 2. Insertar rounds si existen
    if (payload.rounds && payload.rounds.length > 0) {
      const roundsToInsert = payload.rounds.map((round) => ({
        match_game_id: matchGame.id,
        round_number: round.round_number,
        map_name: round.map_name,
        survivors_score: round.survivors_score,
        infected_score: round.infected_score,
        duration_seconds: round.duration_seconds,
      }));

      const { error: roundsError } = await supabase
        .from("match_rounds")
        .insert(roundsToInsert);

      if (roundsError) {
        console.error("Error inserting rounds:", roundsError);
        // No retornamos error, solo logueamos
      } else {
        console.log(`Inserted ${roundsToInsert.length} rounds`);
      }
    }

    // 3. Insertar player stats
    const statsToInsert = payload.player_stats.map((stat) => ({
      match_game_id: matchGame.id,
      steam_id: stat.steam_id,
      user_id: stat.user_id,
      team: stat.team,
      kills: stat.kills || 0,
      deaths: stat.deaths || 0,
      damage_dealt: stat.damage_dealt || 0,
      damage_taken: stat.damage_taken || 0,
      ff_damage: stat.ff_damage || 0,
      headshots: stat.headshots || 0,
      commons_killed: stat.commons_killed || 0,
      si_killed: stat.si_killed || 0,
      tanks_killed: stat.tanks_killed || 0,
      witches_killed: stat.witches_killed || 0,
      pills_used: stat.pills_used || 0,
      medkits_used: stat.medkits_used || 0,
      survivor_damage: stat.survivor_damage || 0,
      hunter_pounces: stat.hunter_pounces || 0,
      hunter_deadstops: stat.hunter_deadstops || 0,
      charger_impacts: stat.charger_impacts || 0,
      smoker_pulls: stat.smoker_pulls || 0,
      boomer_vomits: stat.boomer_vomits || 0,
      jockey_rides: stat.jockey_rides || 0,
      spitter_hits: stat.spitter_hits || 0,
    }));

    const { error: statsError } = await supabase
      .from("match_player_stats")
      .insert(statsToInsert);

    if (statsError) {
      console.error("Error inserting player stats:", statsError);
      return new Response(
        JSON.stringify({
          error: "Failed to insert player stats",
          details: statsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Inserted ${statsToInsert.length} player stats`);

    // 4. Resetear match_state a QUEUE
    const { error: resetError } = await supabase
      .from("match_state")
      .update({
        phase: "QUEUE",
        voting_round: null,
        captain_survivor_id: null,
        captain_infected_id: null,
        current_picker_id: null,
        server_ip: null,
        server_match_id: null,
      })
      .eq("id", matchState.id);

    if (resetError) {
      console.error("Error resetting match state:", resetError);
      // No retornamos error, match ya fue guardado
    }

    // 5. Limpiar rosters y queue
    await supabase
      .from("match_rosters")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("lobby_queue")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("Match stats submitted successfully");

    // El trigger automáticamente actualizará los rankings
    return new Response(
      JSON.stringify({
        success: true,
        match_game_id: matchGame.id,
        message: "Match stats submitted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
