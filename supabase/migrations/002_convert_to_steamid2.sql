-- Script para migrar SteamIDs de SteamID64 a SteamID2
-- Ejecutar en Supabase SQL Editor DESPUÉS de aplicar los cambios del código

-- ============================================
-- IMPORTANTE: Este script convierte todos los SteamIDs existentes
-- de formato SteamID64 (76561197988614833) a SteamID2 (STEAM_1:1:14174552)
-- ============================================

-- Función helper para convertir SteamID64 a SteamID2
CREATE OR REPLACE FUNCTION steamid64_to_steamid2(steamid64 TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    steam_id_base BIGINT := 76561197960265728;
    account_id BIGINT;
    y INT;
    z BIGINT;
    x INT := 1;
BEGIN
    -- Calcular accountId
    account_id := steamid64::BIGINT - steam_id_base;
    
    -- Calcular Y (último bit)
    y := (account_id % 2)::INT;
    
    -- Calcular Z
    z := (account_id - y) / 2;
    
    -- Retornar formato STEAM_X:Y:Z
    RETURN 'STEAM_' || x || ':' || y || ':' || z;
END;
$$;

-- ============================================
-- Paso 1: Ver cómo quedarían los IDs convertidos
-- ============================================
-- Primero revisa esto para asegurarte que la conversión es correcta

SELECT 
    steam_id as steamid64_original,
    steamid64_to_steamid2(steam_id) as steamid2_convertido,
    nickname
FROM lobby_queue
LIMIT 10;

-- Si los resultados se ven correctos, ejecuta los siguientes updates:

-- ============================================
-- Paso 2: Actualizar lobby_queue
-- ============================================
UPDATE lobby_queue
SET steam_id = steamid64_to_steamid2(steam_id)
WHERE steam_id ~ '^\d{17}$'; -- Solo actualiza si es SteamID64 (17 dígitos)

-- ============================================
-- Paso 3: Actualizar match_rosters
-- ============================================
UPDATE match_rosters
SET steam_id = steamid64_to_steamid2(steam_id)
WHERE steam_id ~ '^\d{17}$';

-- ============================================
-- Paso 4: Actualizar match_player_stats
-- ============================================
UPDATE match_player_stats
SET steam_id = steamid64_to_steamid2(steam_id)
WHERE steam_id ~ '^\d{17}$';

-- ============================================
-- Paso 5: Actualizar player_rankings
-- ============================================
UPDATE player_rankings
SET steam_id = steamid64_to_steamid2(steam_id)
WHERE steam_id ~ '^\d{17}$';

-- ============================================
-- Paso 6: Actualizar admins
-- ============================================
UPDATE admins
SET steam_id = steamid64_to_steamid2(steam_id)
WHERE steam_id ~ '^\d{17}$';

-- ============================================
-- Verificación Final
-- ============================================
-- Revisa que todos los steam_ids ahora estén en formato SteamID2

SELECT 'lobby_queue' as tabla, COUNT(*) as total_steamid2
FROM lobby_queue
WHERE steam_id ~ '^STEAM_[0-5]:[01]:\d+$'
UNION ALL
SELECT 'match_rosters', COUNT(*)
FROM match_rosters
WHERE steam_id ~ '^STEAM_[0-5]:[01]:\d+$'
UNION ALL
SELECT 'match_player_stats', COUNT(*)
FROM match_player_stats
WHERE steam_id ~ '^STEAM_[0-5]:[01]:\d+$'
UNION ALL
SELECT 'player_rankings', COUNT(*)
FROM player_rankings
WHERE steam_id ~ '^STEAM_[0-5]:[01]:\d+$'
UNION ALL
SELECT 'admins', COUNT(*)
FROM admins
WHERE steam_id ~ '^STEAM_[0-5]:[01]:\d+$';

-- ============================================
-- LIMPIEZA (Opcional)
-- ============================================
-- Una vez verificado que todo funciona, puedes eliminar la función helper:
-- DROP FUNCTION IF EXISTS steamid64_to_steamid2(TEXT);
