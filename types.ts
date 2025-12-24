export interface MemberConfig {
  gear: {
    monitor: string;
    mouse: string;
    keyboard: string;
    headset: string;
    mousepad: string;
  };
  pc: {
    cpu: string;
    gpu: string;
    ram: string;
  };
  settings: {
    dpi: number;
    sensitivity: number;
    edpi: number;
    pollingRate: string;
    resolution: string;
    aspectRatio: string;
    refreshRate: string;
    crosshairCode: string;
  };
}

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
  config?: MemberConfig;
}

export interface EngagementData {
  date: string;
  views: number;
  interactions: number;
  sentiment: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export enum LoadingState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface Match {
  id: number;
  opponent: string;
  game: string;
  league: string;
  date: Date;
  isLive?: boolean;
  actionLabel: string;
  url?: string;
  stage?: string;
  maps?: string;
  bestOf?: number;
}

export interface MatchResult {
  id: number;
  opponent: string;
  game: string;
  league: string;
  outcome: "WIN" | "LOSS";
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
  status: "ongoing" | "past";
  details?: string;
}

export interface Player {
  name: string;
  raw: {
    score?: number;
    time: number;
  };
}

export interface SourceServer {
  id: string;
  status: "online" | "offline";
  address: string;
  port: number;
  mode: string;
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  playerList: Player[];
}
