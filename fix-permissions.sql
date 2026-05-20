-- Run these commands in PostgreSQL to fix permissions
-- Connect as postgres user or superuser

-- Grant schema usage to game_user
GRANT USAGE ON SCHEMA public TO game_user;

-- Grant table creation permissions
GRANT CREATE ON SCHEMA public TO game_user;

-- Grant all permissions on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO game_user;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO game_user;
