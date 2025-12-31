// Supabase Edge Function: get-match-info
// Endpoint para que el servidor obtenga información del match

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface MatchInfo {
  match_id: string;
  server_ip: string | null;
  config: string;
  teams: {
    survivors: Array<{
      steam_id: string;
      nickname: string;
      user_id: string;
    }>;
    infected: Array<{
      steam_id: string;
      nickname: string;
      user_id: string;
    }>;
  };
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

    // Actualizar last_used_at
    await supabase
      .from("server_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyData.id);

    // Obtener match_id de la query string
    const url = new URL(req.url);
    const matchId = url.searchParams.get("match_id");

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "Missing match_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Getting match info for: ${matchId}`);

    // Obtener información del match_state
    const { data: matchState, error: matchError } = await supabase
      .from("match_state")
      .select("*")
      .eq("server_match_id", matchId)
      .single();

    if (matchError || !matchState) {
      console.error("Match not found:", matchError);
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que el match esté en fase READY
    if (matchState.phase !== "READY") {
      return new Response(
        JSON.stringify({
          error: `Match is not ready. Current phase: ${matchState.phase}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obtener rosters (equipos)
    const { data: rosters, error: rostersError } = await supabase
      .from("match_rosters")
      .select("*");

    if (rostersError) {
      console.error("Error fetching rosters:", rostersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch team rosters" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Organizar jugadores por equipo
    const survivors = rosters
      .filter((r) => r.team === "SURVIVORS")
      .map((r) => ({
        steam_id: r.steam_id,
        nickname: r.nickname,
        user_id: r.user_id,
      }));

    const infected = rosters
      .filter((r) => r.team === "INFECTED")
      .map((r) => ({
        steam_id: r.steam_id,
        nickname: r.nickname,
        user_id: r.user_id,
      }));

    const matchInfo: MatchInfo = {
      match_id: matchId,
      server_ip: matchState.server_ip,
      config: "zonemod", // Puedes agregar esto al match_state si quieres diferentes configs
      teams: {
        survivors,
        infected,
      },
    };

    console.log("Match info retrieved successfully:", matchInfo);

    return new Response(JSON.stringify(matchInfo), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
