/**
 * Colossus Matchmaking - L4D2 Server Integration
 * 
 * Versión 1.2.0 - Usando cURL (RipExt)
 */

#pragma semicolon 1
#pragma newdecls required

#include <sourcemod>
#include <sdktools>
#include <ripext>

#define PLUGIN_VERSION "1.2.0"

// ConVars
ConVar g_cvApiUrl;
ConVar g_cvApiKey;
ConVar g_cvAutoAssignTeams;
ConVar g_cvDebugMode;

// Estados del match
enum MatchPhase {
    Phase_Idle,
    Phase_Loading,
    Phase_InProgress,
    Phase_Completed
}

MatchPhase g_CurrentPhase = Phase_Idle;

// Información del match actual
char g_sMatchId[64];
char g_sApiUrl[256];
char g_sApiKey[128];

// Equipos
ArrayList g_SurvivorTeam;
ArrayList g_InfectedTeam;

// Estadísticas por jugador  
StringMap g_PlayerStats;

// Round tracking
int g_CurrentRound = 0;
int g_SurvivorScore = 0;
int g_InfectedScore = 0;

public Plugin myinfo = {
    name = "Colossus Matchmaking Integration",
    author = "Colossus Team",
    description = "Integración del servidor L4D2 con sistema de matchmaking",
    version = PLUGIN_VERSION,
    url = "https://github.com/colossus-team"
};

public void OnPluginStart() {
    // ConVars
    CreateConVar("sm_colossus_version", PLUGIN_VERSION, "Plugin version", FCVAR_NOTIFY | FCVAR_DONTRECORD);
    g_cvApiUrl = CreateConVar("sm_colossus_api_url", "https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1", "Supabase Edge Functions URL");
    g_cvApiKey = CreateConVar("sm_colossus_api_key", "", "API Key del servidor", FCVAR_PROTECTED);
    g_cvAutoAssignTeams = CreateConVar("sm_colossus_auto_assign", "1", "Asignar equipos automáticamente");
    g_cvDebugMode = CreateConVar("sm_colossus_debug", "0", "Modo debug");
    
    AutoExecConfig(true, "colossus_matchmaking");
    
    // Comandos de admin
    RegAdminCmd("sm_startmatch", Cmd_StartMatch, ADMFLAG_ROOT, "Iniciar match - Uso: sm_startmatch <match_id>");
    RegAdminCmd("sm_endmatch", Cmd_EndMatch, ADMFLAG_ROOT, "Terminar match actual");
    RegAdminCmd("sm_resetteams", Cmd_ResetTeams, ADMFLAG_ROOT, "Resetear asignación de equipos");
    RegAdminCmd("sm_showstats", Cmd_ShowStats, ADMFLAG_ROOT, "Mostrar estadísticas actuales");
    RegAdminCmd("sm_debugmatch", Cmd_DebugMatch, ADMFLAG_ROOT, "Mostrar información de debugging");
    
    // Arrays de equipos
    g_SurvivorTeam = new ArrayList(ByteCountToCells(64));
    g_InfectedTeam = new ArrayList(ByteCountToCells(64));
    
    // StringMap para stats
    g_PlayerStats = new StringMap();
    
    // Hooks de eventos
    HookEvent("player_death", Event_PlayerDeath);
    HookEvent("player_hurt", Event_PlayerHurt);
    HookEvent("infected_death", Event_InfectedDeath);
    HookEvent("player_incapacitated", Event_PlayerIncap);
    HookEvent("pills_used", Event_PillsUsed);
    HookEvent("heal_success", Event_HealSuccess);
    HookEvent("round_start", Event_RoundStart);
    HookEvent("round_end", Event_RoundEnd);
    
    DebugPrint("Plugin loaded successfully");
}

//==================================================
// COMANDOS
//==================================================

public Action Cmd_StartMatch(int client, int args) {
    if (args < 1) {
        ReplyToCommand(client, "[Colossus] Uso: sm_startmatch <match_id>");
        return Plugin_Handled;
    }
    
    if (g_CurrentPhase != Phase_Idle) {
        ReplyToCommand(client, "[Colossus] Ya hay un match en progreso");
        return Plugin_Handled;
    }
    
    GetCmdArg(1, g_sMatchId, sizeof(g_sMatchId));
    
    PrintToChatAll("[Colossus] Iniciando match: %s", g_sMatchId);
    PrintToChatAll("[Colossus] Obteniendo información del servidor...");
    
    g_CurrentPhase = Phase_Loading;
    
    FetchMatchInfo();
    
    return Plugin_Handled;
}

public Action Cmd_EndMatch(int client, int args) {
    if (g_CurrentPhase == Phase_Idle) {
        ReplyToCommand(client, "[Colossus] No hay ningún match activo");
        return Plugin_Handled;
    }
    
    PrintToChatAll("[Colossus] Finalizando match manualmente...");
    EndMatch();
    
    return Plugin_Handled;
}

public Action Cmd_ResetTeams(int client, int args) {
    ClearTeams();
    PrintToChatAll("[Colossus] Equipos reseteados");
    return Plugin_Handled;
}

public Action Cmd_ShowStats(int client, int args) {
    ReplyToCommand(client, "[Colossus] Mostrando estadísticas en consola del servidor");
    PrintAllStats();
    return Plugin_Handled;
}

public Action Cmd_DebugMatch(int client, int args) {
    ReplyToCommand(client, "=== COLOSSUS DEBUG INFO ===");
    ReplyToCommand(client, "Match ID: %s", g_sMatchId);
    ReplyToCommand(client, "Phase: %d", g_CurrentPhase);
    ReplyToCommand(client, "Round: %d", g_CurrentRound);
    ReplyToCommand(client, "Score - Survivors: %d, Infected: %d", g_SurvivorScore, g_InfectedScore);
    ReplyToCommand(client, "Survivors Team Size: %d", g_SurvivorTeam.Length);
    ReplyToCommand(client, "Infected Team Size: %d", g_InfectedTeam.Length);
    return Plugin_Handled;
}

//==================================================
// API: OBTENER INFORMACIÓN DEL MATCH
//==================================================

void FetchMatchInfo() {
    g_cvApiUrl.GetString(g_sApiUrl, sizeof(g_sApiUrl));
    g_cvApiKey.GetString(g_sApiKey, sizeof(g_sApiKey));
    
    if (strlen(g_sApiKey) == 0) {
        LogError("[Colossus] API Key no configurada!");
        PrintToChatAll("[Colossus] ERROR: API Key no configurada");
        g_CurrentPhase = Phase_Idle;
        return;
    }
    
    char sUrl[512];
    Format(sUrl, sizeof(sUrl), "%s/get-match-info?match_id=%s", g_sApiUrl, g_sMatchId);
    
    DebugPrint("Fetching match info from: %s", sUrl);
    
    HTTPRequest request = new HTTPRequest(sUrl);
    request.SetHeader("x-api-key", g_sApiKey);
    request.SetHeader("Content-Type", "application/json");
    request.Get(OnMatchInfoReceived);
}

void OnMatchInfoReceived(HTTPResponse response, any value) {
    if (response.Status != HTTPStatus_OK) {
        LogError("[Colossus] API returned status code: %d", response.Status);
        PrintToChatAll("[Colossus] ERROR: API retornó código %d", response.Status);
        g_CurrentPhase = Phase_Idle;
        return;
    }
    
    JSONObject json = view_as<JSONObject>(response.Data);
    if (json == null) {
        LogError("[Colossus] Failed to parse JSON response");
        PrintToChatAll("[Colossus] ERROR: Respuesta inválida de la API");
        g_CurrentPhase = Phase_Idle;
        return;
    }
    
    DebugPrint("API Response received");
    
    ParseMatchInfoJSON(json);
    
    delete json;
}

void ParseMatchInfoJSON(JSONObject json) {
    ClearTeams();
    
    // Obtener objeto teams
    JSONObject teams = view_as<JSONObject>(json.Get("teams"));
    if (teams == null) {
        LogError("[Colossus] No teams object in response");
        PrintToChatAll("[Colossus] ERROR: Formato de respuesta inválido");
        g_CurrentPhase = Phase_Idle;
        return;
    }
    
    // Obtener arrays de equipos
    JSONArray survivors = view_as<JSONArray>(teams.Get("survivors"));
    JSONArray infected = view_as<JSONArray>(teams.Get("infected"));
    
    if (survivors == null || infected == null) {
        LogError("[Colossus] No team arrays in response");
        PrintToChatAll("[Colossus] ERROR: Equipos inválidos");
        delete teams;
        g_CurrentPhase = Phase_Idle;
        return;
    }
    
    // Procesar survivors
    for (int i = 0; i < survivors.Length; i++) {
        JSONObject player = view_as<JSONObject>(survivors.Get(i));
        
        char steamId[64];
        player.GetString("steam_id", steamId, sizeof(steamId));
        
        g_SurvivorTeam.PushString(steamId);
        DebugPrint("Added to Survivors team: %s", steamId);
        
        delete player;
    }
    
    // Procesar infected
    for (int i = 0; i < infected.Length; i++) {
        JSONObject player = view_as<JSONObject>(infected.Get(i));
        
        char steamId[64];
        player.GetString("steam_id", steamId, sizeof(steamId));
        
        g_InfectedTeam.PushString(steamId);
        DebugPrint("Added to Infected team: %s", steamId);
        
        delete player;
    }
    
    delete survivors;
    delete infected;
    delete teams;
    
    DebugPrint("Teams loaded - Survivors: %d, Infected: %d", g_SurvivorTeam.Length, g_InfectedTeam.Length);
    
    PrintToChatAll("[Colossus] Match cargado correctamente!");
    PrintToChatAll("[Colossus] Survivors: %d jugadores", g_SurvivorTeam.Length);
    PrintToChatAll("[Colossus] Infected: %d jugadores", g_InfectedTeam.Length);
    
    if (g_cvAutoAssignTeams.BoolValue) {
        CreateTimer(2.0, Timer_AssignTeams, _, TIMER_REPEAT | TIMER_FLAG_NO_MAPCHANGE);
    }
    
    g_CurrentPhase = Phase_InProgress;
}

//==================================================
// ASIGNACIÓN DE EQUIPOS
//==================================================

public Action Timer_AssignTeams(Handle timer) {
    if (g_CurrentPhase != Phase_InProgress) {
        return Plugin_Stop;
    }
    
    bool allAssigned = true;
    
    for (int i = 0; i < g_SurvivorTeam.Length; i++) {
        char steamId[64];
        g_SurvivorTeam.GetString(i, steamId, sizeof(steamId));
        
        int client = GetClientBySteamId(steamId);
        if (client > 0 && IsClientInGame(client)) {
            if (GetClientTeam(client) != 2) {
                ChangeClientTeam(client, 2);
                PrintToChat(client, "[Colossus] Has sido asignado al equipo Survivors");
            }
        } else {
            allAssigned = false;
        }
    }
    
    for (int i = 0; i < g_InfectedTeam.Length; i++) {
        char steamId[64];
        g_InfectedTeam.GetString(i, steamId, sizeof(steamId));
        
        int client = GetClientBySteamId(steamId);
        if (client > 0 && IsClientInGame(client)) {
            if (GetClientTeam(client) != 3) {
                ChangeClientTeam(client, 3);
                PrintToChat(client, "[Colossus] Has sido asignado al equipo Infected");
            }
        } else {
            allAssigned = false;
        }
    }
    
    if (allAssigned) {
        PrintToChatAll("[Colossus] Todos los jugadores asignados correctamente!");
        return Plugin_Stop;
    }
    
    return Plugin_Continue;
}

int GetClientBySteamId(const char[] steamId) {
    for (int i = 1; i <= MaxClients; i++) {
        if (IsClientInGame(i) && !IsFakeClient(i)) {
            char clientSteamId[64];
            GetClientAuthId(i, AuthId_Steam2, clientSteamId, sizeof(clientSteamId));
            if (StrEqual(steamId, clientSteamId)) {
                return i;
            }
        }
    }
    return -1;
}

//==================================================
// EVENTOS - TRACKING DE ESTADÍSTICAS
//==================================================

public void Event_PlayerDeath(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    int victim = GetClientOfUserId(event.GetInt("userid"));
    int attacker = GetClientOfUserId(event.GetInt("attacker"));
    bool headshot = event.GetBool("headshot");
    
    if (victim > 0 && victim <= MaxClients) {
        IncrementStat(victim, "deaths", 1);
    }
    
    if (attacker > 0 && attacker <= MaxClients && attacker != victim) {
        IncrementStat(attacker, "kills", 1);
        if (headshot) {
            IncrementStat(attacker, "headshots", 1);
        }
    }
}

public void Event_PlayerHurt(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    int victim = GetClientOfUserId(event.GetInt("userid"));
    int attacker = GetClientOfUserId(event.GetInt("attacker"));
    int damage = event.GetInt("dmg_health");
    
    if (attacker > 0 && attacker <= MaxClients) {
        IncrementStat(attacker, "damage_dealt", damage);
        
        if (victim > 0 && GetClientTeam(attacker) == GetClientTeam(victim)) {
            IncrementStat(attacker, "ff_damage", damage);
        }
    }
    
    if (victim > 0 && victim <= MaxClients) {
        IncrementStat(victim, "damage_taken", damage);
    }
}

public void Event_InfectedDeath(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    int attacker = GetClientOfUserId(event.GetInt("attacker"));
    if (attacker > 0 && attacker <= MaxClients) {
        IncrementStat(attacker, "commons_killed", 1);
    }
}

public void Event_PlayerIncap(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    int victim = GetClientOfUserId(event.GetInt("userid"));
    if (victim > 0) {
        IncrementStat(victim, "incaps", 1);
    }
}

public void Event_PillsUsed(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    int client = GetClientOfUserId(event.GetInt("userid"));
    if (client > 0) {
        IncrementStat(client, "pills_used", 1);
    }
}

public void Event_HealSuccess(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    int client = GetClientOfUserId(event.GetInt("userid"));
    if (client > 0) {
        IncrementStat(client, "medkits_used", 1);
    }
}

public void Event_RoundStart(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    g_CurrentRound++;
    DebugPrint("Round %d started", g_CurrentRound);
}

public void Event_RoundEnd(Event event, const char[] name, bool dontBroadcast) {
    if (g_CurrentPhase != Phase_InProgress) return;
    
    DebugPrint("Round %d ended", g_CurrentRound);
}

//==================================================
// GESTIÓN DE ESTADÍSTICAS
//==================================================

void InitPlayerStats(int client) {
    char steamId[64];
    if (!GetClientAuthId(client, AuthId_Steam2, steamId, sizeof(steamId))) {
        return;
    }
    
    StringMap stats = new StringMap();
    stats.SetValue("kills", 0);
    stats.SetValue("deaths", 0);
    stats.SetValue("damage_dealt", 0);
    stats.SetValue("damage_taken", 0);
    stats.SetValue("ff_damage", 0);
    stats.SetValue("headshots", 0);
    stats.SetValue("commons_killed", 0);
    stats.SetValue("pills_used", 0);
    stats.SetValue("medkits_used", 0);
    
    g_PlayerStats.SetValue(steamId, stats);
}

void IncrementStat(int client, const char[] stat, int value) {
    char steamId[64];
    if (!GetClientAuthId(client, AuthId_Steam2, steamId, sizeof(steamId))) {
        return;
    }
    
    StringMap stats;
    if (!g_PlayerStats.GetValue(steamId, stats)) {
        InitPlayerStats(client);
        if (!g_PlayerStats.GetValue(steamId, stats)) {
            return;
        }
    }
    
    int current;
    stats.GetValue(stat, current);
    stats.SetValue(stat, current + value);
}

void PrintAllStats() {
    PrintToServer("=== COLOSSUS MATCH STATS ===");
    
    StringMapSnapshot snap = g_PlayerStats.Snapshot();
    for (int i = 0; i < snap.Length; i++) {
        char steamId[64];
        snap.GetKey(i, steamId, sizeof(steamId));
        
        StringMap stats;
        g_PlayerStats.GetValue(steamId, stats);
        
        int kills, deaths, damage;
        stats.GetValue("kills", kills);
        stats.GetValue("deaths", deaths);
        stats.GetValue("damage_dealt", damage);
        
        PrintToServer("%s - K:%d D:%d DMG:%d", steamId, kills, deaths, damage);
    }
    
    delete snap;
}

//==================================================
// FINALIZAR MATCH Y ENVIAR STATS
//==================================================

void EndMatch() {
    if (g_CurrentPhase == Phase_Idle) return;
    
    g_CurrentPhase = Phase_Completed;
    
    PrintToChatAll("[Colossus] Match finalizado! Enviando estadísticas...");
    
    char winner[16];
    if (g_SurvivorScore > g_InfectedScore) {
        strcopy(winner, sizeof(winner), "SURVIVORS");
    } else if (g_InfectedScore > g_SurvivorScore) {
        strcopy(winner, sizeof(winner), "INFECTED");
    } else {
        strcopy(winner, sizeof(winner), "TIE");
    }
    
    DebugPrint("Building stats payload");
    
    BuildAndSubmitStats(winner);
    
    CreateTimer(5.0, Timer_ResetMatch);
}

void BuildAndSubmitStats(const char[] winner) {
    JSONObject payload = new JSONObject();
    
    payload.SetString("match_id", g_sMatchId);
    payload.SetString("winner", winner);
    payload.SetInt("final_score_survivors", g_SurvivorScore);
    payload.SetInt("final_score_infected", g_InfectedScore);
    
    char timeStr[64];
    FormatTime(timeStr, sizeof(timeStr), "%Y-%m-%dT%H:%M:%SZ", GetTime());
    payload.SetString("started_at", timeStr);
    payload.SetString("ended_at", timeStr);
    
    // Rounds array (vacío por ahora)
    JSONArray rounds = new JSONArray();
    payload.Set("rounds", rounds);
    delete rounds;
    
    // Player stats array
    JSONArray playerStats = new JSONArray();
    
    StringMapSnapshot snap = g_PlayerStats.Snapshot();
    for (int i = 0; i < snap.Length; i++) {
        char steamId[64];
        snap.GetKey(i, steamId, sizeof(steamId));
        
        StringMap stats;
        g_PlayerStats.GetValue(steamId, stats);
        
        JSONObject playerObj = BuildPlayerStatsJSON(steamId, stats);
        playerStats.Push(playerObj);
        delete playerObj;
    }
    delete snap;
    
    payload.Set("player_stats", playerStats);
    delete playerStats;
    
    // Enviar a API
    char sUrl[512];
    Format(sUrl, sizeof(sUrl), "%s/submit-match-stats", g_sApiUrl);
    
    HTTPRequest request = new HTTPRequest(sUrl);
    request.SetHeader("x-api-key", g_sApiKey);
    request.SetHeader("Content-Type", "application/json");
    request.Post(payload, OnStatsSubmitted);
    
    delete payload;
}

JSONObject BuildPlayerStatsJSON(const char[] steamId, StringMap stats) {
    JSONObject obj = new JSONObject();
    
    obj.SetString("steam_id", steamId);
    obj.SetString("user_id", "00000000-0000-0000-0000-000000000000");
    
    int client = GetClientBySteamId(steamId);
    int team = (client > 0) ? GetClientTeam(client) : 0;
    obj.SetString("team", (team == 2) ? "SURVIVORS" : "INFECTED");
    
    int kills, deaths, dmg, dmgTaken, ff, headshots, commons, pills, medkits;
    stats.GetValue("kills", kills);
    stats.GetValue("deaths", deaths);
    stats.GetValue("damage_dealt", dmg);
    stats.GetValue("damage_taken", dmgTaken);
    stats.GetValue("ff_damage", ff);
    stats.GetValue("headshots", headshots);
    stats.GetValue("commons_killed", commons);
    stats.GetValue("pills_used", pills);
    stats.GetValue("medkits_used", medkits);
    
    obj.SetInt("kills", kills);
    obj.SetInt("deaths", deaths);
    obj.SetInt("damage_dealt", dmg);
    obj.SetInt("damage_taken", dmgTaken);
    obj.SetInt("ff_damage", ff);
    obj.SetInt("headshots", headshots);
    obj.SetInt("commons_killed", commons);
    obj.SetInt("pills_used", pills);
    obj.SetInt("medkits_used", medkits);
    
    // Stats por defecto
    obj.SetInt("si_killed", 0);
    obj.SetInt("tanks_killed", 0);
    obj.SetInt("witches_killed", 0);
    obj.SetInt("survivor_damage", 0);
    obj.SetInt("hunter_pounces", 0);
    obj.SetInt("hunter_deadstops", 0);
    obj.SetInt("charger_impacts", 0);
    obj.SetInt("smoker_pulls", 0);
    obj.SetInt("boomer_vomits", 0);
    obj.SetInt("jockey_rides", 0);
    obj.SetInt("spitter_hits", 0);
    
    return obj;
}

void OnStatsSubmitted(HTTPResponse response, any value) {
    if (response.Status == HTTPStatus_OK) {
        PrintToChatAll("[Colossus] Estadísticas enviadas correctamente!");
        PrintToChatAll("[Colossus] Gracias por jugar!");
    } else {
        LogError("[Colossus] Stats API returned status code: %d", response.Status);
        PrintToChatAll("[Colossus] ERROR: API retornó código %d", response.Status);
    }
}

public Action Timer_ResetMatch(Handle timer) {
    g_CurrentPhase = Phase_Idle;
    g_CurrentRound = 0;
    g_SurvivorScore = 0;
    g_InfectedScore = 0;
    strcopy(g_sMatchId, sizeof(g_sMatchId), "");
    
    ClearTeams();
    ClearStats();
    
    DebugPrint("Match reset complete");
    return Plugin_Stop;
}

//==================================================
// UTILIDADES
//==================================================

void ClearTeams() {
    g_SurvivorTeam.Clear();
    g_InfectedTeam.Clear();
}

void ClearStats() {
    StringMapSnapshot snap = g_PlayerStats.Snapshot();
    for (int i = 0; i < snap.Length; i++) {
        char steamId[64];
        snap.GetKey(i, steamId, sizeof(steamId));
        
        StringMap stats;
        if (g_PlayerStats.GetValue(steamId, stats)) {
            delete stats;
        }
    }
    delete snap;
    
    g_PlayerStats.Clear();
}

void DebugPrint(const char[] format, any ...) {
    if (!g_cvDebugMode.BoolValue) return;
    
    char buffer[512];
    VFormat(buffer, sizeof(buffer), format, 2);
    PrintToServer("[Colossus DEBUG] %s", buffer);
}
