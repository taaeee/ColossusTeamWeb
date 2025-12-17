declare module "gamedig" {
  export const GameDig: {
    query(options: {
      type: string;
      host: string;
      port?: number;
      maxAttempts?: number;
      socketTimeout?: number;
    }): Promise<{
      name: string;
      map: string;
      players: Array<{
        name: string;
        score?: number;
        time?: number;
      }>;
      maxplayers: number;
    }>;
  };
}
