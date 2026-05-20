-- Create users table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    tim VARCHAR(50) NOT NULL,
    eliminated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    username VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create currency table
CREATE TABLE IF NOT EXISTS currency (
    username VARCHAR(50) PRIMARY KEY,
    amount INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_results table for tracking game history
CREATE TABLE IF NOT EXISTS game_results (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL,
    team VARCHAR(50) NOT NULL,
    rank INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_team ON users(tim);
CREATE INDEX IF NOT EXISTS idx_users_eliminated ON users(eliminated);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_results_game_id ON game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_username ON game_results(username);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add foreign key constraints after all tables are created
DO $$
BEGIN
    -- Add currency foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_currency_user' 
        AND table_name = 'currency'
    ) THEN
        ALTER TABLE currency ADD CONSTRAINT fk_currency_user 
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE;
    END IF;
    
    -- Add game_results foreign keys if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_game_results_game' 
        AND table_name = 'game_results'
    ) THEN
        ALTER TABLE game_results ADD CONSTRAINT fk_game_results_game 
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_game_results_user' 
        AND table_name = 'game_results'
    ) THEN
        ALTER TABLE game_results ADD CONSTRAINT fk_game_results_user 
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE;
    END IF;
END $$;

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    -- Users trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_users_updated_at' 
        AND event_object_table = 'users'
    ) THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Admins trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_admins_updated_at' 
        AND event_object_table = 'admins'
    ) THEN
        CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Games trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_games_updated_at' 
        AND event_object_table = 'games'
    ) THEN
        CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Currency trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_currency_updated_at' 
        AND event_object_table = 'currency'
    ) THEN
        CREATE TRIGGER update_currency_updated_at BEFORE UPDATE ON currency
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
