import { Trophy, Calendar, DollarSign, ArrowUpRight } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Tournament } from "../types";
import { getTournaments } from "../services/dataService";

export const TournamentsList: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "ongoing" | "past">("all");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      const data = await getTournaments();
      setTournaments(data);
    };
    fetchTournaments();
  }, []);

  const filteredTournaments = tournaments.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Filter Tabs */}
      <div className="flex justify-center gap-1 mb-12">
        {["all", "upcoming", "past"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-8 py-2 text-xs tracking-[0.2em] uppercase transition-all duration-300 border border-transparent ${
              filter === f
                ? "bg-white text-black border-white"
                : "bg-zinc-900/50 text-zinc-500 hover:text-white hover:border-white/20"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredTournaments.map((t) => (
          <div
            key={t.id}
            className="group flex flex-col bg-zinc-900/30 border border-white/10 hover:border-white/30 transition-all duration-500"
          >
            {/* Image Container */}
            <div className="h-64 w-full relative overflow-hidden">
              <img
                src={t.image}
                alt={t.name}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/20 to-transparent" />

              {/* Floating Status Badge */}
              <div className="absolute top-4 right-4">
                {t.status === "ongoing" ? (
                  <span className="bg-white text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                    Ongoing
                  </span>
                ) : (
                  <span className="bg-zinc-800 text-zinc-400 border border-white/10 text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                    Completed
                  </span>
                )}
              </div>
            </div>

            {/* Content Container */}
            <div className="p-8 flex flex-col flex-1 relative">
              {/* Decorative line */}
              <div className="absolute top-0 left-8 right-8 h-px bg-white/5 group-hover:bg-white/10 transition-colors" />

              <div className="mb-6">
                <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] block mb-2">
                  {t.league}
                </span>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight group-hover:text-zinc-200 transition-colors">
                  {t.name}
                </h3>
                <div className="flex items-center gap-2 text-zinc-400 text-xs tracking-wide">
                  <Calendar size={12} />
                  <span>{t.date}</span>
                </div>
              </div>

              <div className="mt-auto pt-6 flex items-end justify-between">
                <div>
                  {t.result ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-zinc-600 tracking-widest">
                        Result
                      </span>
                      <div className="flex items-center gap-2 text-white">
                        <Trophy size={16} className="text-zinc-400" />
                        <span className="font-medium tracking-wider text-lg">
                          {t.result}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-zinc-600 tracking-widest">
                        Prize Pool
                      </span>
                      <div className="flex items-center gap-1 text-white">
                        <span className="font-medium tracking-wider text-lg">
                          {t.prize}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button className="px-6 py-3 bg-transparent border border-white/20 text-white text-[10px] tracking-[0.2em] font-bold uppercase hover:bg-white hover:text-black hover:border-white transition-all duration-300 flex items-center gap-2 group/btn">
                  Details
                  <ArrowUpRight
                    size={12}
                    className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
