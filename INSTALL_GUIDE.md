# Guía de Instalación: Sistema de Matchmaking con Integración de Servidor

## Resumen del Sistema

Has implementado un sistema completo de matchmaking con integración de servidor L4D2 que incluye:

- **Base de datos** con tablas para partidas, estadísticas y rankings con ELO
- **Edge Functions** para comunicación servidor-API
- **Plugin SourceMod** para el servidor L4D2
- **Interfaz web** actualizada con comandos de servidor

## Arquitectura del Sistema

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Web App   │────────▶│   Supabase   │◀────────│ L4D2 Server │
│  (React)    │         │  (Database   │         │  (Plugin)   │
│             │         │   + Edge     │         │             │
│             │         │   Functions) │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
      ▼                        ▼                        ▼
  BetView.tsx           API Endpoints           SourceMod Plugin
  - Matchmaking         - get-match-info        - Team Assignment
  - Team Selection      - submit-match-stats    - Stats Tracking
  - UI/UX               - Authentication         - API Communication
```

---

## Parte 1: Configuración de Base de Datos

### Paso 1: Ejecutar Script SQL

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo: `supabase/migrations/001_matchmaking_schema.sql`
3. Copia todo el contenido y pégalo en el editor
4. Haz clic en **Run** para ejecutar

Esto creará:

- ✅ Tablas: `match_games`, `match_rounds`, `match_player_stats`, `player_rankings`, `server_api_keys`
- ✅ Funciones: `calculate_elo_change`, `update_player_rankings_after_match`
- ✅ Triggers automáticos para actualizar rankings
- ✅ Políticas RLS

### Paso 2: Generar API Key para el Servidor

En el mismo SQL Editor, ejecuta:

```sql
INSERT INTO server_api_keys (api_key, server_name, server_ip)
VALUES (
  encode(gen_random_bytes(32), 'hex'),
  'Servidor Principal',
  '54.209.216.171:27015'
);

SELECT api_key, server_name FROM server_api_keys WHERE server_name = 'Servidor Principal';
```

**IMPORTANTE**: Copia la `api_key` generada. La necesitarás en el Paso 5.

---

## Parte 2: Desplegar Edge Functions

### Paso 1: Instalar Supabase CLI

```bash
npm install -g supabase
```

### Paso 2: Login en Supabase

```bash
supabase login
```

### Paso 3: Link al Proyecto

```bash
cd f:\Repos\colossus-team
supabase link --project-ref obfrxccyavwhfwdpvlkm
```

### Paso 4: Desplegar Functions

```bash
# Desplegar get-match-info
supabase functions deploy get-match-info

# Desplegar submit-match-stats
supabase functions deploy submit-match-stats
```

### Paso 5: Verificar Deployment

Prueba las functions:

```bash
curl -i --location --request GET 'https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1/get-match-info?match_id=test' \
  --header 'x-api-key: 1792f40dffe4cd720258906a6a0ea895afba5339e948d5be9263a606562ff168'
```

Deberías recibir un error 404 (match not found), lo cual confirma que la function está activa.

---

## Parte 3: Compilar e Instalar Plugin SourceMod

### Requisitos Previos

1. **SourceMod 1.11+** instalado en tu servidor L4D2
2. **System2 Extension v3.3.2**:
   - Descarga: https://github.com/dordnung/System2/releases/tag/v3.3.2
   - Linux: Coloca `system2.ext.so` en `addons/sourcemod/extensions/`
   - Windows: Coloca `system2.ext.dll` en `addons/sourcemod/extensions/`

### Paso 1: Compilar el Plugin

Si tienes spcomp local:

```bash
cd f:\Repos\colossus-team\sourcemod-plugin\scripting
spcomp l4d2_colossus_matchmaking.sp -o../plugins/l4d2_colossus_matchmaking.smx
```

O usa un compilador online como https://spider.limetech.io/

### Paso 2: Subir al Servidor

```bash
# Conexión SSH al servidor
ssh tu-usuario@54.209.216.171

# Crear directorio del plugin
mkdir -p ~/steam/steamapps/common/l4d2/left4dead2/addons/sourcemod/plugins/

# Desde tu máquina local, sube el plugin
scp f:\Repos\colossus-team\sourcemod-plugin\plugins\l4d2_colossus_matchmaking.smx \
    tu-usuario@54.209.216.171:~/steam/steamapps/common/l4d2/left4dead2/addons/sourcemod/plugins/
```

### Paso 3: Configurar el Plugin

1. Sube el archivo de configuración:

```bash
scp f:\Repos\colossus-team\sourcemod-plugin\cfg\sourcemod\colossus_matchmaking.cfg \
    tu-usuario@54.209.216.171:~/steam/steamapps/common/l4d2/left4dead2/cfg/sourcemod/
```

2. SSH al servidor y edita la config:

```bash
nano ~/steam/steamapps/common/l4d2/left4dead2/cfg/sourcemod/colossus_matchmaking.cfg
```

3. Pega la **API Key** del Paso 1.2:

```cfg
sm_colossus_api_url "https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1"
sm_colossus_api_key "PEGA_TU_API_KEY_AQUI"
sm_colossus_auto_assign "1"
sm_colossus_debug "1"  // Activa debug durante testing
```

### Paso 4: Reiniciar el Servidor

```bash
# Detener servidor
screen -r l4d2  # O como sea que manejes el proceso
# Ctrl+C para detener

# Iniciar servidor
./srcds_run -game left4dead2 +map c1m1_hotel -maxplayers 8

# Verificar que el plugin cargó
# En la consola RCON del servidor:
sm plugins list | grep colossus
```

Deberías ver:

```
[XX] "Colossus Matchmaking Integration" (1.0.0) by Colossus Team
```

---

## Parte 4: Actualizar Aplicación Web

### Paso 1: Rebuild y Deploy

```bash
cd f:\Repos\colossus-team

# Instalar dependencias si es necesario
npm install

# Build para producción
npm run build

# Deploy (método depende de tu hosting)
# Ejemplo si usas Vercel:
vercel --prod
```

### Paso 2: Probar en Desarrollo

```bash
npm run dev
```

Abre https://localhost:5173 y verifica que:

- La fase READY muestra el comando `sm_startmatch`
- Los admins ven el botón de copiar
- Todo funciona normalmente

---

## Parte 5: Flujo Completo de Uso

### 1. Crear Match en Web

1. 8 jugadores se unen a la cola (QUEUE phase)
2. Automáticamente pasa a VOTING
3. Se votan capitanes (Survivor e Infected)
4. Pasa a PICKING, capitanes seleccionan equipos
5. Cuando todos están seleccionados, pasa a **READY**

### 2. En Fase READY

La UI mostrará (para admins):

```
┌───────────────────────────────────────────┐
│   ⚡ COMANDO DEL SERVIDOR                 │
│   EJECUTA ESTO EN LA CONSOLA DEL         │
│   SERVIDOR L4D2                           │
│                                           │
│   sm_startmatch 8f4c3b2a-1d5e-...        │
│                                           │
│   [📋 COPIAR COMANDO]                     │
└───────────────────────────────────────────┘
```

### 3. En el Servidor L4D2

Como admin, conecta vía RCON o consola:

```bash
# Via RCON
rcon_password tu_password
rcon sm_startmatch 8f4c3b2a-1d5e-4a8f-b3c2-9e7f6a5d4c3b
```

O conectate directamente y ejecuta en consola.

### 4. El Plugin Automáticamente

1. ✅ Consulta la API para obtener match info
2. ✅ Carga los equipos desde la DB
3. ✅ Espera a que los jugadores conecten
4. ✅ Asigna automáticamente a cada jugador a su equipo
5. ✅ Inicia el tracking de estadísticas
6. ✅ Comienza el match

### 5. Durante el Match

- El plugin trackea todas las estadísticas en tiempo real
- Los jugadores juegan normalmente
- Al finalizar todas las rondas/campaña

### 6. Fin del Match

Ejecuta en el servidor:

```bash
sm_endmatch
```

O el plugin detecta automáticamente el fin y:

1. ✅ Calcula ganador y estadísticas
2. ✅ Envía todo a la API (`submit-match-stats`)
3. ✅ La DB guarda el match en `match_games`
4. ✅ Guarda stats de jugadores en `match_player_stats`
5. ✅ El **trigger SQL actualiza automáticamente los rankings** con nuevo ELO
6. ✅ El match_state vuelve a `QUEUE`
7. ✅ La cola se limpia automáticamente

---

## Comandos Útiles del Servidor

```bash
sm_startmatch <match_id>   # Inicia match
sm_endmatch               # Termina match
sm_resetteams             # Resetea equipos
sm_showstats              # Muestra stats en consola
sm_debugmatch             # Info de debugging
```

---

## Troubleshooting

### Plugin no carga

**Verificar**:

```bash
sm exts list  # Verifica que System2 esté activo
cat logs/errors_*.log  # Revisa errores
```

### API Key inválida

**Error**: `Invalid API key`

**Solución**: Verifica que la API key en `colossus_matchmaking.cfg` coincide con la de la tabla `server_api_keys`

### Match no encontrado

**Error**: `Match not found`

**Posibles causas**:

- Match ID incorrecto
- Match no está en fase READY
- Problema de red/conectividad

**Solución**:

```sql
-- Verifica en Supabase:
SELECT * FROM match_state WHERE server_match_id = 'tu-match-id';
```

### Jugadores no se asignan

**Causa**: SteamIDs no coinciden

**Solución**:

1. Activa debug: `sm_colossus_debug 1`
2. Revisa logs del servidor
3. Verifica que los SteamIDs en `match_rosters` sean correctos (formato STEAM_X:Y:Z)

---

## Base de Datos: Queries Útiles

### Ver últimas partidas

```sql
SELECT mg.*, pr.wins, pr.elo_rating
FROM match_games mg
JOIN player_rankings pr ON true
ORDER BY mg.created_at DESC
LIMIT 10;
```

### Ver top jugadores por ELO

```sql
SELECT steam_id, elo_rating, total_games, wins, losses
FROM player_rankings
ORDER BY elo_rating DESC
LIMIT 20;
```

### Ver estadísticas de un jugador

```sql
SELECT mps.*, mg.winner, mg.created_at
FROM match_player_stats mps
JOIN match_games mg ON mps.match_game_id = mg.id
WHERE mps.steam_id = 'STEAM_1:0:12345678'
ORDER BY mg.created_at DESC;
```

---

## Próximos Pasos (Opcionales)

1. **Crear componente de estadísticas** en React para mostrar rankings
2. **Agregar más stats** (hunter pounces, charger impacts, etc.)
3. **Sistema de seasons** para resetear rankings periódicamente
4. **Penalizaciones por abandon** (detectar disconnects mid-match)
5. **Replay system** (guardar demos del servidor)

---

## Soporte

Si encuentras problemas:

1. Revisa los logs del servidor: `logs/errors_*.log`
2. Activa debug mode: `sm_colossus_debug 1`
3. Verifica la conectividad con Supabase
4. Revisa las funciones Edge en Supabase Dashboard → Functions → Logs

---

¡El sistema está completo y listo para usar! 🎮🚀
