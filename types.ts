export interface TeamMember {
  id: number;
  name: string;
  role: string;
  image: string;
  socials: {
    steam?: string;
    kick?: string;
    discord?: string;
    twitch?: string;
    youtube?: string;
    twitter?: string;
  };
}

export interface EngagementData {
  date: string;
  views: number;
  interactions: number;
  sentiment: number;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface Match {
  id: number;
  opponent: string;
  game: string;
  league: string;
  date: string;
  isLive?: boolean;
  actionLabel: string;
}

export interface MatchResult {
  id: number;
  opponent: string;
  game: string;
  league: string;
  outcome: 'WIN' | 'LOSS';
  score: string;
  url?: string;
}

export interface Tournament {
  id: number;
  name: string;
  league: string;
  date: string;
  prize?: string;
  result?: string;
  image: string;
  status: 'upcoming' | 'past';
}