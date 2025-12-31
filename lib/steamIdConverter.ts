/**
 * Funciones Helper para Conversión de SteamID
 *
 * Convierte entre SteamID64 (76561197960265728) y SteamID2 (STEAM_1:0:0)
 * para mantener compatibilidad con el servidor L4D2
 */

/**
 * Convierte SteamID64 a SteamID2
 * @param steamId64 - SteamID en formato 64-bit (ej: "76561197960265728")
 * @returns SteamID en formato STEAM_X:Y:Z (ej: "STEAM_1:0:0")
 */
export function steamId64ToSteamId2(steamId64: string): string {
  const STEAM_ID_BASE = BigInt("76561197960265728");
  const steamId64BigInt = BigInt(steamId64);

  // Calcular accountId
  const accountId = steamId64BigInt - STEAM_ID_BASE;

  // Y = accountId % 2 (último bit)
  const Y = Number(accountId % BigInt(2));

  // Z = (accountId - Y) / 2
  const Z = Number((accountId - BigInt(Y)) / BigInt(2));

  // X siempre es 1 para Steam Universe Public
  const X = 1;

  return `STEAM_${X}:${Y}:${Z}`;
}

/**
 * Convierte SteamID2 a SteamID64
 * @param steamId2 - SteamID en formato STEAM_X:Y:Z (ej: "STEAM_1:0:12345")
 * @returns SteamID en formato 64-bit (ej: "76561197960290458")
 */
export function steamId2ToSteamId64(steamId2: string): string {
  const STEAM_ID_BASE = BigInt("76561197960265728");

  // Parse STEAM_X:Y:Z
  const match = steamId2.match(/STEAM_(\d+):(\d+):(\d+)/);
  if (!match) {
    throw new Error(`Invalid SteamID2 format: ${steamId2}`);
  }

  const Y = BigInt(match[2]);
  const Z = BigInt(match[3]);

  // accountId = Z * 2 + Y
  const accountId = Z * BigInt(2) + Y;

  // steamId64 = accountId + BASE
  const steamId64 = accountId + STEAM_ID_BASE;

  return steamId64.toString();
}

/**
 * Valida si un string es un SteamID64 válido
 */
export function isValidSteamId64(steamId: string): boolean {
  return /^\d{17}$/.test(steamId);
}

/**
 * Valida si un string es un SteamID2 válido
 */
export function isValidSteamId2(steamId: string): boolean {
  return /^STEAM_[0-5]:[01]:\d+$/.test(steamId);
}

// Ejemplos de uso:
// steamId64ToSteamId2("76561197960265728") => "STEAM_1:0:0"
// steamId64ToSteamId2("76561198000123456") => "STEAM_1:0:19928864"
// steamId2ToSteamId64("STEAM_1:0:0") => "76561197960265728"
