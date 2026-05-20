-- Enhance games table to match original JSON structure

-- Add new columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 5;
ALTER TABLE games ADD COLUMN IF NOT EXISTS reward_coins INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_url VARCHAR(255);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_teams junction table to store team assignments and player counts
CREATE TABLE IF NOT EXISTS game_teams (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    team_name VARCHAR(50) NOT NULL,
    player_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_name) REFERENCES teams(name) ON DELETE CASCADE,
    UNIQUE(game_id, team_name)
);

-- Insert default teams
INSERT INTO teams (name) VALUES 
    ('Team Alpha'), 
    ('Team Beta'), 
    ('Team Gamma')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_teams_game_id ON game_teams(game_id);
CREATE INDEX IF NOT EXISTS idx_game_teams_team_name ON game_teams(team_name);

-- Add triggers for updated_at on game_teams
CREATE TRIGGER update_game_teams_updated_at BEFORE UPDATE ON game_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
