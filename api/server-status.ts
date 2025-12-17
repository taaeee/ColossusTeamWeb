import { GameDig } from "gamedig";

export default async function handler(req: any, res: any) {
  try {
    const state = await GameDig.query({
      type: "l4d2",
      host: "54.209.216.171",
      port: 27015,
    });

    res.status(200).json({
      id: "1",
      address: "54.209.216.171",
      port: 27015,
      status: "online",
      mode: "versus",
      name: state.name,
      map: state.map,
      players: state.players.length,
      maxPlayers: state.maxplayers,
      playerList: state.players,
    });
  } catch {
    res
      .status(200)
      .json({ status: "offline", mode: "unknown", playerList: [] });
  }
}
