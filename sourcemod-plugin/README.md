# Colossus Matchmaking - SourceMod Plugin

## Descripción

Plugin de SourceMod para Left 4 Dead 2 que integra el servidor con el sistema de matchmaking web de Colossus Team.

## Características

- **Asignación automática de equipos**: Los jugadores son asignados automáticamente a sus equipos según el matchmaking
- **Tracking de estadísticas en tiempo real**: Registra kills, muertes, daño, y más
- **Integración completa con API**: Comunicación bidireccional con Supabase
- **Sistema de comandos admin**: Control total sobre el match desde el servidor
- **Modo debug**: Logging detallado para troubleshooting

## Requisitos

### Extensiones de SourceMod

- **RipExt** (REST in Pawn Extension): Para HTTP requests y JSON parsing
  - Descarga: https://github.com/ErikMinekus/sm-ripext/releases/latest
  - Instalación:
    - Extrae `ripext.ext.so` (Linux) o `ripext.ext.dll` (Windows) en `addons/sourcemod/extensions/`
    - Extrae `ripext.inc` en `addons/sourcemod/scripting/include/`

### Dependencias del Sistema

No se requieren dependencias adicionales.

## Instalación

### 1. Copiar archivos del plugin

```bash
# Copiar el plugin compilado
cp l4d2_colossus_matchmaking.smx /path/to/server/left4dead2/addons/sourcemod/plugins/

# Copiar el archivo de configuración
cp colossus_matchmaking.cfg /path/to/server/left4dead2/cfg/sourcemod/
```

### 2. Compilar el plugin (opcional)

Si necesitas compilar desde el código fuente:

```bash
cd sourcemod-plugin/scripting
./spcomp l4d2_colossus_matchmaking.sp -o../plugins/l4d2_colossus_matchmaking.smx
```

### 3. Obtener API Key

Ejecuta esta query en Supabase SQL Editor para generar una API key:

```sql
INSERT INTO server_api_keys (api_key, server_name, server_ip)
VALUES (
  encode(gen_random_bytes(32), 'hex'),
  'Servidor Principal',
  '54.209.216.171:27015'
);

SELECT api_key FROM server_api_keys WHERE server_name = 'Servidor Principal';
```

Copia la API key generada.

### 4. Configurar el plugin

Edita `cfg/sourcemod/colossus_matchmaking.cfg`:

```cfg
sm_colossus_api_url "https://obfrxccyavwhfwdpvlkm.supabase.co/functions/v1"
sm_colossus_api_key "TU_API_KEY_AQUI"  // Pega la API key del paso 3
sm_colossus_auto_assign "1"
sm_colossus_debug "0"
```

### 5. Reiniciar el servidor

```bash
./srcds_run -game left4dead2 +map c1m1_hotel
```

## Uso

### Comandos de Admin

Todos estos comandos requieren permisos de ROOT (`ADMFLAG_ROOT`).

#### `sm_startmatch <match_id>`

Inicia un match con el ID especificado.

```
sm_startmatch 8f4c3b2a-1d5e-4a8f-b3c2-9e7f6a5d4c3b
```

**Flujo**:

1. Plugin consulta la API para obtener información del match
2. Carga los equipos desde la base de datos
3. Asigna jugadores automáticamente cuando conectan
4. Inicia el tracking de estadísticas

#### `sm_endmatch`

Finaliza el match actual manualmente.

```
sm_endmatch
```

**Acciones**:

- Calcula estadísticas finales
- Determina el ganador (por score)
- Envía stats a la API
- Resetea el servidor para el siguiente match

#### `sm_resetteams`

Resetea la asignación de equipos.

```
sm_resetteams
```

#### `sm_showstats`

Muestra estadísticas actuales en la consola del servidor.

```
sm_showstats
```

Salida ejemplo:

```
=== COLOSSUS MATCH STATS ===
STEAM_1:0:12345678 - K:25 D:3 DMG:15420
STEAM_1:1:87654321 - K:18 D:5 DMG:12350
...
```

#### `sm_debugmatch`

Muestra información de debugging del match actual.

```
sm_debugmatch
```

Información mostrada:

- Match ID
- Fase actual
- Ronda actual
- Scores
- Tamaño de equipos
- Estado del match

### Flujo Completo de Uso

1. **En el sistema web**: Completa el matchmaking hasta la fase READY
2. **El sistema genera un match_id** único (UUID)
3. **En el servidor L4D2**, ejecuta como admin:
   ```
   sm_startmatch <match_id>
   ```
4. **El plugin automáticamente**:
   - Obtiene la info del match de la API
   - Asigna jugadores a sus equipos cuando se conectan
   - Inicia el tracking de stats
5. **Juega la partida** normalmente
6. **Al finalizar**, ejecuta:
   ```
   sm_endmatch
   ```
   O el plugin detecta automáticamente cuando termina la campaña
7. **Las estadísticas se envían** a la base de datos
8. **Los rankings se actualizan** automáticamente via triggers SQL

## Estadísticas Trackeadas

### Generales

- Kills
- Deaths
- Damage dealt
- Damage taken
- Friendly fire damage
- Headshots

### Survivors

- Commons killed
- Special infected killed
- Tanks killed (future)
- Witches killed (future)
- Pills used
- Medkits used

### Infected

- Survivor damage
- Hunter pounces (future)
- Charger impacts (future)
- Smoker pulls (future)
- Etc.

## Troubleshooting

### El plugin no carga

**Síntomas**: No aparece en `sm plugins list`

**Solución**:

1. Verifica que System2 esté instalado: `sm exts list`
2. Revisa logs: `cat logs/errors_*.log`
3. Activa debug mode y revisa consola

### Error "Missing API key"

**Causa**: No se configuró `sm_colossus_api_key`

**Solución**:

1. Genera una API key en Supabase (ver paso 3 de instalación)
2. Edita `cfg/sourcemod/colossus_matchmaking.cfg`
3. Recarga config: `sm_rcon sm_reloadconfig`

### Error "Match not found"

**Causas posibles**:

- El match_id es incorrecto
- El match no está en fase READY
- La base de datos no tiene el registro

**Solución**:

1. Verifica el match_id en la base de datos:
   ```sql
   SELECT * FROM match_state WHERE server_match_id = 'tu-match-id';
   ```
2. Confirma que `phase = 'READY'`
3. Activa debug mode: `sm_colossus_debug 1`

### Los jugadores no se asignan automáticamente

**Causa**: Asignación automática desactivada o jugadores no en roster

**Solución**:

1. Activa auto-assign: `sm_colossus_auto_assign 1`
2. Verifica que los SteamIDs estén en `match_rosters`
3. Revisa logs de debug

### Las estadísticas no se envían

**Síntomas**: Match finaliza pero no se guardan stats

**Solución**:

1. Revisa logs del servidor
2. Verifica conectividad con Supabase
3. Confirma que la API key sea válida
4. Prueba hacer un request manual con curl

## Estructura del Proyecto

```
sourcemod-plugin/
├── scripting/
│   └── l4d2_colossus_matchmaking.sp    # Código fuente
├── plugins/
│   └── l4d2_colossus_matchmaking.smx   # Plugin compilado
├── cfg/
│   └── sourcemod/
│       └── colossus_matchmaking.cfg     # Configuración
└── README.md                            # Esta documentación
```

## Desarrollo

### Modificar el plugin

1. Edita `scripting/l4d2_colossus_matchmaking.sp`
2. Compila con `spcomp`:
   ```bash
   ./spcomp l4d2_colossus_matchmaking.sp -o../plugins/l4d2_colossus_matchmaking.smx
   ```
3. Recarga el plugin en el servidor:
   ```
   sm plugins reload l4d2_colossus_matchmaking
   ```

### Agregar nuevas estadísticas

1. Agrega el campo en `InitPlayerStats()`
2. Hook el evento correspondiente
3. Llama a `IncrementStat()` cuando ocurra
4. Actualiza `BuildPlayerStatsJson()` para incluir en payload
5. Agrega columna en tabla `match_player_stats` en Supabase

## Licencia

AGPL-3.0 - Ver LICENSE file

## Soporte

Para reportar bugs o solicitar features:

- GitHub Issues: [Colossus Team Repository]
- Discord: [Link al servidor]

## Créditos

- Plugin desarrollado por Colossus Team
- Basado en la integración de cedapug.com
- System2 extension por dordnung
