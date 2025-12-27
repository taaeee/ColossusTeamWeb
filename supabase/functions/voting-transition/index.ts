import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🚀 Voting transition function called");

    // Get current match state
    const { data: matchState, error: stateError } = await supabase
      .from("match_state")
      .select("*")
      .single();

    if (stateError || !matchState) {
      console.log("❌ No match state found");
      return new Response(JSON.stringify({ error: "No match state found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check if in voting phase
    if (matchState.phase !== "VOTING") {
      console.log("⚠️ Not in voting phase:", matchState.phase);
      return new Response(JSON.stringify({ message: "Not in voting phase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if voting time expired
    const endTime = new Date(matchState.voting_end_time).getTime();
    const now = Date.now();

    if (now < endTime) {
      const secondsLeft = Math.floor((endTime - now) / 1000);
      console.log(`⏰ Voting still in progress: ${secondsLeft}s remaining`);
      return new Response(
        JSON.stringify({ message: "Voting still in progress", secondsLeft }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Voting time expired, processing transition...");

    // Fetch all votes
    const { data: votes, error: votesError } = await supabase
      .from("match_votes")
      .select("*");

    if (votesError) {
      console.error("❌ Error fetching votes:", votesError);
      throw votesError;
    }

    console.log(`📊 Found ${votes?.length || 0} votes`);

    // Fetch queue to get user_id to steam_id mapping
    const { data: queue, error: queueError } = await supabase
      .from("lobby_queue")
      .select("*");

    if (queueError || !queue) {
      console.error("❌ Error fetching queue:", queueError);
      throw queueError;
    }

    // Create user_id to steam_id mapping
    const userIdToSteamId: { [key: string]: string } = {};
    queue.forEach((player) => {
      userIdToSteamId[player.user_id] = player.steam_id;
    });

    // Count votes
    const voteCounts: { [key: string]: number } = {};
    votes?.forEach((vote) => {
      voteCounts[vote.voted_for_id] = (voteCounts[vote.voted_for_id] || 0) + 1;
    });

    console.log("Vote counts:", voteCounts);

    // Determine captain
    let captainId: string;
    let selectionMethod: "voted" | "random" | "tie";

    if (Object.keys(voteCounts).length === 0) {
      // No votes - random selection
      console.log("⚠️ NO VOTES - Using random selection");
      selectionMethod = "random";

      // Filter out already-selected captain if in INFECTED round
      let availableQueue = queue;
      if (
        matchState.voting_round === "INFECTED" &&
        matchState.captain_survivor_id
      ) {
        availableQueue = queue.filter(
          (p) => p.user_id !== matchState.captain_survivor_id
        );
      }

      const randomIndex = Math.floor(Math.random() * availableQueue.length);
      captainId = availableQueue[randomIndex].user_id;
      console.log("Random captain selected:", captainId);
    } else {
      // Sort by vote count
      const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

      if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
        // Tie - random between tied players
        console.log("⚠️ TIE detected - Using random selection among tied");
        selectionMethod = "tie";
        const tiedPlayers = sorted.filter(
          ([_, count]) => count === sorted[0][1]
        );
        const randomIndex = Math.floor(Math.random() * tiedPlayers.length);
        captainId = tiedPlayers[randomIndex][0];
        console.log("Tie-break captain:", captainId);
      } else {
        // Clear winner
        selectionMethod = "voted";
        captainId = sorted[0][0];
        console.log(
          "✅ Voted captain:",
          captainId,
          "with",
          sorted[0][1],
          "votes"
        );
      }
    }

    // Perform transition based on voting round
    if (matchState.voting_round === "SURVIVOR") {
      console.log("=== TRANSITION: SURVIVOR → INFECTED ===");

      // Set new timestamp for infected voting
      const votingEndTime = new Date(Date.now() + 20000).toISOString();

      await supabase
        .from("match_state")
        .update({
          voting_round: "INFECTED",
          captain_survivor_id: captainId,
          voting_end_time: votingEndTime,
        })
        .eq("id", matchState.id);

      // Clear votes for next round
      await supabase
        .from("match_votes")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      console.log("✅ Transitioned to INFECTED voting");

      return new Response(
        JSON.stringify({
          message: "Transitioned to INFECTED voting",
          captain: captainId,
          method: selectionMethod,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // INFECTED round complete → PICKING phase
      console.log("=== TRANSITION: INFECTED → PICKING ===");

      // Prevent duplicate captain
      let infectedCaptainId = captainId;
      if (infectedCaptainId === matchState.captain_survivor_id) {
        console.log(
          "⚠️ Duplicate captain detected, selecting different player"
        );
        const availableQueue = queue.filter(
          (p) => p.user_id !== matchState.captain_survivor_id
        );
        const randomIndex = Math.floor(Math.random() * availableQueue.length);
        infectedCaptainId = availableQueue[randomIndex].user_id;
        console.log("New infected captain:", infectedCaptainId);
      }

      // Update to PICKING phase
      await supabase
        .from("match_state")
        .update({
          phase: "PICKING",
          captain_infected_id: infectedCaptainId,
          current_picker_id: matchState.captain_survivor_id, // Survivor picks first
          voting_end_time: null,
        })
        .eq("id", matchState.id);

      // Insert captains into rosters
      const survivorCaptain = queue.find(
        (p) => p.user_id === matchState.captain_survivor_id
      );
      const infectedCaptain = queue.find(
        (p) => p.user_id === infectedCaptainId
      );

      if (survivorCaptain) {
        await supabase.from("match_rosters").insert({
          steam_id: survivorCaptain.steam_id,
          nickname: survivorCaptain.nickname,
          team: "SURVIVOR",
          pick_order: 0,
        });
      }

      if (infectedCaptain) {
        await supabase.from("match_rosters").insert({
          steam_id: infectedCaptain.steam_id,
          nickname: infectedCaptain.nickname,
          team: "INFECTED",
          pick_order: 0,
        });
      }

      console.log("✅ Transitioned to PICKING phase");

      return new Response(
        JSON.stringify({
          message: "Transitioned to PICKING",
          survivorCaptain: matchState.captain_survivor_id,
          infectedCaptain: infectedCaptainId,
          method: selectionMethod,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("❌ Error in voting transition:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
