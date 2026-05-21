-- Add new fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bds_team VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS player_id INTEGER;

-- Add comments to describe the columns
COMMENT ON COLUMN users.name IS 'Full name of the user';
COMMENT ON COLUMN users.initial IS 'Initial or nickname of the user';
COMMENT ON COLUMN users.gender IS 'Gender: L for male, P for female';
COMMENT ON COLUMN users.bds_team IS 'BDS team name (WIBU, BTS, BDSM, SQI, Kabiro)';
COMMENT ON COLUMN users.birthdate IS 'Date of birth';
COMMENT ON COLUMN users.player_id IS 'Unique player identifier';
