import React from 'react';
import { Play, ExternalLink, Trophy, Calendar, Clock, ChevronRight } from 'lucide-react';

interface Match {
  id: string;
  opponent: string;
  game: string;
  league: string;
  date: string;
  isLive?: boolean;
  actionLabel: string;
}

interface Result {
  id: string;
  opponent: string;
  game: string;
  league: string;
  outcome: 'WIN' | 'LOSS';
  score: string;
}

const UPCOMING_MATCHES: Match[] = [
  { 
    id: '1', 
    opponent: 'Enhypen', 
    game: 'Left 4 Dead 2', 
    league: 'Another World Tournament', 
    date: 'Today at 7:00 PM EST', 
    isLive: true,
    actionLabel: 'WATCH LIVE' 
  },
  { 
    id: '2', 
    opponent: '4ssault', 
    game: 'Left 4 Dead 2', 
    league: 'Another World Tournament', 
    date: 'Tomorrow at 6:00 PM EST', 
    actionLabel: 'DETAILS' 
  },
];

const RECENT_RESULTS: Result[] = [
  { 
    id: '3', 
    opponent: '4ssault', 
    game: 'Left 4 Dead 2', 
    league: 'Another World Tournament', 
    outcome: 'WIN', 
    score: '1 - 0' 
  },
  { 
    id: '4', 
    opponent: 'revenant', 
    game: 'Left 4 Dead 2', 
    league: 'Another World Tournament', 
    outcome: 'WIN', 
    score: '1 - 0' 
  },
  { 
    id: '5', 
    opponent: 'Los brainrots', 
    game: 'Left 4 Dead 2', 
    league: 'Another World Tournament', 
    outcome: 'WIN', 
    score: '1 - 0' 
  },
];

export const MatchesList: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto">
      
      {/* Upcoming Matches */}
      <div className="mb-16">
        <h3 className="text-2xl font-light tracking-tight text-white mb-8 flex items-center gap-3">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          UPCOMING MATCHES
        </h3>
        
        <div className="space-y-4">
          {UPCOMING_MATCHES.map((match) => (
            <div 
              key={match.id} 
              className="group relative border border-white/10 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-300 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm"
            >
               {/* Left: Teams */}
               <div className="flex items-center gap-6 md:w-1/3">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs">
                       C
                     </div>
                     <span className="text-lg font-bold tracking-widest text-white">Colossus</span>
                  </div>
                  <span className="text-zinc-600 text-sm font-light italic">vs</span>
                  <div className="flex items-center gap-3">
                     <span className="text-lg font-bold tracking-widest text-zinc-300 group-hover:text-white transition-colors">{match.opponent}</span>
                  </div>
               </div>

               {/* Middle: Info */}
               <div className="flex flex-col md:items-center md:w-1/3">
                  <span className="text-white font-medium tracking-wide mb-1">{match.game}</span>
                  <span className="text-xs text-zinc-500 uppercase tracking-widest">{match.league}</span>
               </div>

               {/* Right: Date & Action */}
               <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/3">
                  <div className="text-right">
                    <div className={`text-sm tracking-wider ${match.isLive ? 'text-red-500 font-bold animate-pulse' : 'text-zinc-300'}`}>
                      {match.date}
                    </div>
                  </div>
                  <button className={`px-6 py-3 border text-xs tracking-[0.2em] font-medium transition-all duration-300 flex items-center gap-2 ${
                    match.isLive 
                    ? 'bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700 shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                    : 'border-white/20 text-white hover:bg-white hover:text-black'
                  }`}>
                    {match.actionLabel}
                    {match.isLive && <Play size={10} fill="currentColor" />}
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Results */}
      <div>
        <h3 className="text-2xl font-light tracking-tight text-white mb-8">RECENT RESULTS</h3>
        
        <div className="space-y-4">
          {RECENT_RESULTS.map((result) => (
            <div 
              key={result.id} 
              className="group border border-white/10 bg-zinc-900/20 hover:border-white/20 transition-all duration-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Teams */}
               <div className="flex items-center gap-6 md:w-1/3">
                  <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                     <span className="text-base font-bold tracking-widest text-white">Colossus</span>
                  </div>
                  <span className="text-zinc-700 text-xs">vs</span>
                  <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                     <span className="text-base font-bold tracking-widest text-zinc-400">{result.opponent}</span>
                  </div>
               </div>

               {/* Middle: Info */}
               <div className="flex flex-col md:items-center md:w-1/3">
                  <span className="text-sm text-zinc-300 tracking-wide mb-1">{result.game}</span>
                  <span className="text-xs text-zinc-600 uppercase tracking-widest">{result.league}</span>
               </div>

               {/* Right: Result & Action */}
               <div className="flex items-center justify-between md:justify-end gap-8 md:w-1/3">
                  <div className="flex items-center gap-4">
                     <span className={`text-xs font-bold px-2 py-1 rounded tracking-widest ${
                       result.outcome === 'WIN' 
                       ? 'bg-green-900/30 text-green-400 border border-green-900' 
                       : 'bg-red-900/30 text-red-400 border border-red-900'
                     }`}>
                       {result.outcome}
                     </span>
                     <span className="text-xl font-light tracking-widest text-white">{result.score}</span>
                  </div>
                  
                  <button className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-xs tracking-widest uppercase group/btn">
                    <span>Watch VOD</span>
                    <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};