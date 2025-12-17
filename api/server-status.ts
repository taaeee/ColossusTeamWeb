import { GameDig } from "gamedig";

export default async function handler(req: any, res: any) {
  try {
    const state = await GameDig.query({
      type: "l4d2",
      host: "54.209.216.171",
      port: 27015,
    });

    res.status(200).json({
      online: true,
      name: state.name,
      map: state.map,
      players: state.players.length,
      maxPlayers: state.maxplayers,
    });
  } catch {
    res.status(200).json({ online: false });
  }
}
