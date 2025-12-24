import { supabase } from "./supabaseClient";
import { TeamMember, Match, MatchResult, Tournament } from "../types";
import { url } from "inspector";

// Helper to determine if a match is currently live (started in last 3 hours)
const calculateIsLive = (matchDate: Date): boolean => {
  const now = new Date().getTime();
  const startTime = matchDate.getTime();
  const durationMs = 3 * 60 * 60 * 1000; // 3 hours window for "Live" status
  return now >= startTime && now <= startTime + durationMs;
};

// --- MOCK DATA FALLBACKS ---
// These are used if the Supabase connection is missing or fails.

const MOCK_UPCOMING: Match[] = [
  {
    id: 1,
    opponent: "FAZE CLAN",
    game: "VALORANT",
    league: "Valorant Champions Tour",
    date: new Date("2025-12-21T20:00:00Z"), // Example date
    isLive: calculateIsLive(new Date("2025-12-21T20:00:00Z")),
    actionLabel: "WATCH LIVE",
    url: "https://www.youtube.com/@ColossusPOV",
  },
  {
    id: 2,
    opponent: "TEAM LIQUID",
    game: "LEAGUE OF LEGENDS",
    league: "LCS Championship",
    date: new Date("2025-12-22T18:00:00Z"), // Example date
    isLive: calculateIsLive(new Date("2025-12-22T18:00:00Z")),
    actionLabel: "DETAILS",
    url: "https://www.youtube.com/@ColossusPOV",
  },
];

const MOCK_RESULTS: MatchResult[] = [
  {
    id: 3,
    opponent: "OPTIC GAMING",
    game: "VALORANT",
    league: "VCT Masters Copenhagen",
    outcome: "WIN",
    score: "2 - 1",
  },
  {
    id: 4,
    opponent: "G2 ESPORTS",
    game: "CS:GO",
    league: "IEM Cologne 2023",
    outcome: "LOSS",
    score: "0 - 2",
  },
  {
    id: 5,
    opponent: "T1",
    game: "LEAGUE OF LEGENDS",
    league: "Worlds 2023",
    outcome: "WIN",
    score: "3 - 2",
  },
];

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 1,
    name: "VCT 2025: Masters Shanghai",
    league: "VALORANT Champions Tour",
    date: "May 23 – June 9, 2025",
    prize: "$1,000,000",
    image: "https://picsum.photos/800/450?random=10",
    status: "ongoing",
  },
  {
    id: 2,
    name: "IEM Katowice 2025",
    league: "Intel Extreme Masters",
    date: "Jan 31 – Feb 11, 2025",
    result: "1st Place",
    image: "https://picsum.photos/800/450?random=11",
    status: "past",
  },
  {
    id: 3,
    name: "Spring Groups 2025",
    league: "BLAST Premier",
    date: "Jan 22 – Jan 28, 2025",
    result: "Top 8",
    image: "https://picsum.photos/800/450?random=12",
    status: "past",
  },
  {
    id: 4,
    name: "OWCS Dallas Major",
    league: "Overwatch Champions Series",
    date: "May 31 - June 2, 2025",
    prize: "$300,000",
    image: "https://picsum.photos/800/450?random=13",
    status: "ongoing",
  },
];

// --- API FUNCTIONS ---

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const { data, error } = await supabase
      .from("members_with_socials_and_config") // o members_with_socials_fixed
      .select("*");
    console.log(data);
    return data.map((m: any) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      image: m.image,
      socials: m.socials,
      config: m.config,
    }));
  } catch (error) {
    console.warn("Using mock data for Team Members due to fetch error:", error);
    return []; // Return empty array or mock data if needed
  }
};

export const getUpcomingMatches = async (): Promise<Match[]> => {
  if (!supabase) return MOCK_UPCOMING;

  try {
    const { data, error } = await supabase
      .from("Matches")
      .select("*")
      .order("id", { ascending: false }) // los más nuevos primero
      .limit(3);

    if (error || !data) throw error;

    return data.map((m: any) => {
      const matchDate = new Date(m.date);
      return {
        id: m.id,
        opponent: m.opponent,
        game: m.game,
        league: m.league,
        date: matchDate,
        isLive: calculateIsLive(matchDate),
        actionLabel: m.action_label,
        url: m.url,
        stage: m.stage,
        maps: m.maps,
        bestOf: m.bestOf,
      };
    });
  } catch (error) {
    console.warn("Using mock data for Matches due to fetch error:", error);
    return MOCK_UPCOMING;
  }
};

export const getMatchResults = async (): Promise<MatchResult[]> => {
  if (!supabase) return MOCK_RESULTS;

  try {
    const { data, error } = await supabase
      .from("MatchResult")
      .select("*")
      .order("id", { ascending: false }) // los más nuevos primero
      .limit(3);

    if (error || !data) throw error;

    return data.map((m: any) => ({
      id: m.id,
      opponent: m.opponent,
      game: m.game,
      league: m.league,
      outcome: m.outcome,
      score: m.score,
      url: m.url,
    }));
  } catch (error) {
    console.warn("Using mock data for Results due to fetch error:", error);
    return MOCK_RESULTS;
  }
};

export const getTournaments = async (): Promise<Tournament[]> => {
  if (!supabase) return MOCK_TOURNAMENTS;

  try {
    const { data, error } = await supabase.from("Tournament").select("*");

    if (error || !data) throw error;

    return data.map((t: any) => ({
      id: t.id,
      name: t.name,
      league: t.league,
      date: t.date,
      prize: t.prize,
      result: t.result,
      image: t.image,
      status: t.status,
      details: t.details,
    }));
  } catch (error) {
    console.warn("Using mock data for Tournaments due to fetch error:", error);
    return MOCK_TOURNAMENTS;
  }
};
