-- Import existing games from JSON structure

-- Clear existing games to avoid conflicts
DELETE FROM game_teams;
DELETE FROM games;

-- Insert existing games with full structure
INSERT INTO games (id, name, description, duration, reward_coins, game_url, status) VALUES 
    ('1779162952410', 'Effiency Race', 'Deskripsi', 5, 50, '/game/effiency-race', 'inactive'),
    ('1779248808937', 'Test Game', 'test game', 5, 10, '/game/test-game', 'inactive')
ON CONFLICT (id) DO NOTHING;

-- Insert team assignments for first game
INSERT INTO game_teams (game_id, team_name, player_count) VALUES 
    ('1779162952410', 'Team Alpha', 1),
    ('1779162952410', 'Team Beta', 1),
    ('1779162952410', 'Team Gamma', 1)
ON CONFLICT (game_id, team_name) DO NOTHING;

-- Insert team assignments for second game
INSERT INTO game_teams (game_id, team_name, player_count) VALUES 
    ('1779248808937', 'Team Alpha', 1)
ON CONFLICT (game_id, team_name) DO NOTHING;
