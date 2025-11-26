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
  };
}

export interface EngagementData {
  date: string;
  views: number;
  interactions: number;
  sentiment: number;
}

export interface ChatMessage {
  id: string;
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
