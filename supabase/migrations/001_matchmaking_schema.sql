-- ============================================
-- COLOSSUS MATCHMAKING - DATABASE SCHEMA
-- ============================================
-- Este script crea todas las tablas necesarias para el sistema de matchmaking
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. Agregar columna match_id a match_state
-- ============================================
ALTER TABLE match_state 
ADD COLUMN IF NOT EXISTS server_match_id UUID;

-- ============================================
-- 2. Tabla: match_games
-- Almacena información de partidas completadas
-- ============================================
CREATE TABLE IF NOT EXISTS match_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_state_id UUID REFERENCES match_state(id),
  server_match_id UUID UNIQUE NOT NULL,
  
  -- Resultado
  winner TEXT CHECK (winner IN ('SURVIVORS', 'INFECTED', 'TIE')),
  total_rounds INT DEFAULT 0,
  final_score_survivors INT DEFAULT 0,
  final_score_infected INT DEFAULT 0,
  
  -- Configuración
  game_mode TEXT DEFAULT 'versus',
  config_name TEXT DEFAULT 'zonemod',
  
  -- Tiempos
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para match_games
CREATE INDEX IF NOT EXISTS idx_match_games_server_match_id ON match_games(server_match_id);
CREATE INDEX IF NOT EXISTS idx_match_games_created_at ON match_games(created_at DESC);

-- ============================================
-- 3. Tabla: match_rounds
-- Almacena información de cada ronda
-- ============================================
CREATE TABLE IF NOT EXISTS match_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_game_id UUID REFERENCES match_games(id) ON DELETE CASCADE,
  
  round_number INT NOT NULL,
  map_name TEXT NOT NULL,
  
  -- Scores
  survivors_score INT DEFAULT 0,
  infected_score INT DEFAULT 0,
  
  -- Tiempos
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(match_game_id, round_number)
);

-- Índices para match_rounds
CREATE INDEX IF NOT EXISTS idx_match_rounds_game_id ON match_rounds(match_game_id);

-- ============================================
-- 4. Tabla: match_player_stats
-- Estadísticas individuales por jugador por partida
-- ============================================
CREATE TABLE IF NOT EXISTS match_player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_game_id UUID REFERENCES match_games(id) ON DELETE CASCADE,
  steam_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  team TEXT CHECK (team IN ('SURVIVORS', 'INFECTED')),
  
  -- Stats generales
  kills INT DEFAULT 0,
  deaths INT DEFAULT 0,
  damage_dealt INT DEFAULT 0,
  damage_taken INT DEFAULT 0,
  ff_damage INT DEFAULT 0,
  headshots INT DEFAULT 0,
  
  -- Stats específicos survivors
  commons_killed INT DEFAULT 0,
  si_killed INT DEFAULT 0,
  tanks_killed INT DEFAULT 0,
  witches_killed INT DEFAULT 0,
  pills_used INT DEFAULT 0,
  medkits_used INT DEFAULT 0,
  
  -- Stats específicos infected
  survivor_damage INT DEFAULT 0,
  hunter_pounces INT DEFAULT 0,
  hunter_deadstops INT DEFAULT 0,
  charger_impacts INT DEFAULT 0,
  smoker_pulls INT DEFAULT 0,
  boomer_vomits INT DEFAULT 0,
  jockey_rides INT DEFAULT 0,
  spitter_hits INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(match_game_id, steam_id)
);

-- Índices para match_player_stats
CREATE INDEX IF NOT EXISTS idx_match_player_stats_game_id ON match_player_stats(match_game_id);
CREATE INDEX IF NOT EXISTS idx_match_player_stats_steam_id ON match_player_stats(steam_id);
CREATE INDEX IF NOT EXISTS idx_match_player_stats_user_id ON match_player_stats(user_id);

-- ============================================
-- 5. Tabla: player_rankings
-- Rankings globales de jugadores con sistema ELO
-- ============================================
CREATE TABLE IF NOT EXISTS player_rankings (
  steam_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  -- Estadísticas de partidas
  total_games INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  ties INT DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Sistema ELO
  elo_rating INT DEFAULT 1000,
  peak_elo INT DEFAULT 1000,
  
  -- Stats acumuladas
  total_kills INT DEFAULT 0,
  total_deaths INT DEFAULT 0,
  total_damage INT DEFAULT 0,
  kd_ratio DECIMAL(5,2) DEFAULT 0.00,
  avg_damage_per_game DECIMAL(10,2) DEFAULT 0.00,
  
  -- Timestamps
  last_game_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para player_rankings
CREATE INDEX IF NOT EXISTS idx_player_rankings_user_id ON player_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_player_rankings_elo ON player_rankings(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_player_rankings_total_games ON player_rankings(total_games DESC);

-- ============================================
-- 6. Tabla: server_api_keys
-- API keys para que los servidores se autentiquen
-- ============================================
CREATE TABLE IF NOT EXISTS server_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key TEXT UNIQUE NOT NULL,
  server_name TEXT NOT NULL,
  server_ip TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 7. RLS Policies
-- ============================================

-- match_games: Usuarios pueden leer, solo servidor puede escribir
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view match games"
ON match_games FOR SELECT
USING (true);

-- match_rounds: Usuarios pueden leer
ALTER TABLE match_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view match rounds"
ON match_rounds FOR SELECT
USING (true);

-- match_player_stats: Usuarios pueden leer
ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player stats"
ON match_player_stats FOR SELECT
USING (true);

-- player_rankings: Usuarios pueden leer
ALTER TABLE player_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player rankings"
ON player_rankings FOR SELECT
USING (true);

-- server_api_keys: Solo admins pueden ver
ALTER TABLE server_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view API keys"
ON server_api_keys FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE steam_id = (
      SELECT raw_user_meta_data->>'steam_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 8. Función: Calcular ELO
-- ============================================
CREATE OR REPLACE FUNCTION calculate_elo_change(
  current_elo INT,
  opponent_avg_elo INT,
  won BOOLEAN,
  k_factor INT DEFAULT 32
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  expected_score DECIMAL(5,4);
  actual_score INT;
  elo_change INT;
BEGIN
  -- Calcular probabilidad esperada de ganar
  expected_score := 1.0 / (1.0 + POWER(10.0, (opponent_avg_elo - current_elo) / 400.0));
  
  -- Resultado real (1 = victoria, 0 = derrota)
  actual_score := CASE WHEN won THEN 1 ELSE 0 END;
  
  -- Calcular cambio de ELO
  elo_change := ROUND(k_factor * (actual_score - expected_score));
  
  RETURN elo_change;
END;
$$;

-- ============================================
-- 9. Función: Actualizar rankings después de partida
-- ============================================
CREATE OR REPLACE FUNCTION update_player_rankings_after_match(
  p_match_game_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_winner TEXT;
  v_stat RECORD;
  v_current_elo INT;
  v_elo_change INT;
  v_team_avg_elo INT;
  v_opponent_avg_elo INT;
  v_won BOOLEAN;
BEGIN
  -- Obtener ganador
  SELECT winner INTO v_winner
  FROM match_games
  WHERE id = p_match_game_id;
  
  -- Calcular ELO promedio de cada equipo
  SELECT AVG(COALESCE(pr.elo_rating, 1000)) INTO v_team_avg_elo
  FROM match_player_stats mps
  LEFT JOIN player_rankings pr ON mps.steam_id = pr.steam_id
  WHERE mps.match_game_id = p_match_game_id AND mps.team = 'SURVIVORS';
  
  SELECT AVG(COALESCE(pr.elo_rating, 1000)) INTO v_opponent_avg_elo
  FROM match_player_stats mps
  LEFT JOIN player_rankings pr ON mps.steam_id = pr.steam_id
  WHERE mps.match_game_id = p_match_game_id AND mps.team = 'INFECTED';
  
  -- Actualizar cada jugador
  FOR v_stat IN 
    SELECT * FROM match_player_stats 
    WHERE match_game_id = p_match_game_id
  LOOP
    -- Insertar o obtener ranking actual
    INSERT INTO player_rankings (steam_id, user_id)
    VALUES (v_stat.steam_id, v_stat.user_id)
    ON CONFLICT (steam_id) DO NOTHING;
    
    SELECT elo_rating INTO v_current_elo
    FROM player_rankings
    WHERE steam_id = v_stat.steam_id;
    
    -- Determinar si ganó
    v_won := (v_winner = v_stat.team) OR (v_winner = 'TIE');
    
    -- Calcular cambio de ELO
    IF v_stat.team = 'SURVIVORS' THEN
      v_elo_change := calculate_elo_change(v_current_elo, v_opponent_avg_elo, v_won);
    ELSE
      v_elo_change := calculate_elo_change(v_current_elo, v_team_avg_elo, v_won);
    END IF;
    
    -- Actualizar ranking
    UPDATE player_rankings
    SET
      total_games = total_games + 1,
      wins = wins + CASE WHEN v_winner = v_stat.team THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN v_winner != v_stat.team AND v_winner != 'TIE' THEN 1 ELSE 0 END,
      ties = ties + CASE WHEN v_winner = 'TIE' THEN 1 ELSE 0 END,
      win_rate = ROUND((wins + CASE WHEN v_winner = v_stat.team THEN 1 ELSE 0 END)::DECIMAL / (total_games + 1) * 100, 2),
      elo_rating = GREATEST(0, elo_rating + v_elo_change),
      peak_elo = GREATEST(peak_elo, elo_rating + v_elo_change),
      total_kills = total_kills + v_stat.kills,
      total_deaths = total_deaths + v_stat.deaths,
      total_damage = total_damage + v_stat.damage_dealt,
      kd_ratio = CASE 
        WHEN (total_deaths + v_stat.deaths) = 0 THEN (total_kills + v_stat.kills)::DECIMAL
        ELSE ROUND((total_kills + v_stat.kills)::DECIMAL / (total_deaths + v_stat.deaths), 2)
      END,
      avg_damage_per_game = ROUND((total_damage + v_stat.damage_dealt)::DECIMAL / (total_games + 1), 2),
      last_game_at = NOW(),
      updated_at = NOW()
    WHERE steam_id = v_stat.steam_id;
  END LOOP;
END;
$$;

-- ============================================
-- 10. Trigger: Auto-actualizar rankings
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_rankings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo actualizar si el match finalizó (tiene winner)
  IF NEW.winner IS NOT NULL THEN
    PERFORM update_player_rankings_after_match(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_match_game_complete
AFTER INSERT OR UPDATE OF winner ON match_games
FOR EACH ROW
WHEN (NEW.winner IS NOT NULL)
EXECUTE FUNCTION trigger_update_rankings();

-- ============================================
-- SCRIPT COMPLETADO
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- Luego genera una API key ejecutando:
-- 
-- INSERT INTO server_api_keys (api_key, server_name, server_ip)
-- VALUES (
--   encode(gen_random_bytes(32), 'hex'),
--   'Servidor Principal',
--   '54.209.216.171:27015'
-- );
-- 
-- SELECT api_key FROM server_api_keys WHERE server_name = 'Servidor Principal';
