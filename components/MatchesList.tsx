import React from "react";
import {
  Play,
  ExternalLink,
  Trophy,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";
import { getUpcomingMatches, getMatchResults } from "../services/dataService";
import { Match, MatchResult } from "../types";
import { useEffect, useState } from "react";

export const MatchesList: React.FC = () => {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<MatchResult[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const upcoming = await getUpcomingMatches();
      const results = await getMatchResults();
      setUpcomingMatches(upcoming);
      setRecentResults(results);
    };
    fetchData();

    // Refresh every minute to update "Live" statuses
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Upcoming Matches */}
      <div className="mb-16">
        <h3 className="text-2xl font-light tracking-tight text-white mb-8 flex items-center gap-3">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          UPCOMING MATCHES
        </h3>

        <div className="space-y-4">
          {upcomingMatches.map((match) => (
            <div
              key={match.id}
              className="group relative border border-white/10 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-300 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm"
            >
              {/* Left: Teams */}
              <div className="flex items-center gap-6 md:w-1/3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs">
                    C
                  </div>
                  <span className="text-lg font-bold tracking-widest text-white">
                    Colossus
                  </span>
                </div>
                <span className="text-zinc-600 text-sm font-light italic">
                  vs
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold tracking-widest text-zinc-300 group-hover:text-white transition-colors">
                    {match.opponent}
                  </span>
                </div>
              </div>

              {/* Middle: Info */}
              <div className="flex flex-col md:items-center md:w-1/3">
                <span className="text-white font-medium tracking-wide mb-1 uppercase text-xs">
                  {match.game}
                </span>
                <span className="text-[12px] text-zinc-500 uppercase tracking-widest">
                  {match.league}
                </span>
              </div>

              {/* Right: Date & Action */}
              <div className="flex items-center justify-between md:justify-end gap-8 md:w-1/3">
                <div className="flex flex-col items-end gap-1">
                  <div
                    className={`text-[12px] tracking-[0.2em] uppercase flex items-center gap-2 whitespace-nowrap ${
                      match.isLive ? "text-red-500 font-bold" : "text-zinc-400"
                    }`}
                  >
                    {match.isLive ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        <span>LIVE NOW</span>
                      </div>
                    ) : (
                      <>
                        <Calendar size={12} className="text-zinc-600" />
                        <span>{formatDate(match.date)}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => window.open(match.url, "_blank")}
                  className={`px-6 py-3 border text-[10px] tracking-[0.2em] font-bold transition-all duration-300 flex items-center gap-2 min-w-40 justify-center ${
                    match.isLive
                      ? "bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                      : "border-white/20 text-white hover:bg-white hover:text-black"
                  }`}
                >
                  {match.isLive ? "WATCH STREAM" : "MATCH DETAILS"}
                  {match.isLive && <Play size={10} fill="currentColor" />}
                </button>
              </div>

              {/* Status indicator line */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                  match.isLive
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    : "bg-transparent"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Results */}
      <div>
        <h3 className="text-2xl font-light tracking-tight text-white mb-8">
          RECENT RESULTS
        </h3>

        <div className="space-y-4">
          {recentResults.map((result) => (
            <div
              key={result.id}
              className="group border border-white/10 bg-zinc-900/20 hover:border-white/20 transition-all duration-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Teams */}
              <div className="flex items-center gap-6 md:w-1/3">
                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-base font-bold tracking-widest text-white">
                    Colossus
                  </span>
                </div>
                <span className="text-zinc-700 text-xs">vs</span>
                <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-base font-bold tracking-widest text-zinc-400">
                    {result.opponent}
                  </span>
                </div>
              </div>

              {/* Middle: Info */}
              <div className="flex flex-col md:items-center md:w-1/3">
                <span className="text-sm text-zinc-300 tracking-wide mb-1">
                  {result.game}
                </span>
                <span className="text-xs text-zinc-600 uppercase tracking-widest">
                  {result.league}
                </span>
              </div>

              {/* Right: Result & Action */}
              <div className="flex items-center justify-between md:justify-end gap-8 md:w-1/3">
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded tracking-widest ${
                      result.outcome === "WIN"
                        ? "bg-green-900/30 text-green-400 border border-green-900"
                        : "bg-red-900/30 text-red-400 border border-red-900"
                    }`}
                  >
                    {result.outcome}
                  </span>
                  <span className="text-xl font-light tracking-widest text-white">
                    {result.score}
                  </span>
                </div>

                <button
                  onClick={() => window.open(result.url, "_blank")}
                  className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-xs tracking-widest uppercase group/btn"
                >
                  <span>Watch Match</span>
                  <ExternalLink
                    size={12}
                    className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
