-- Add file_name column to games table
ALTER TABLE games ADD COLUMN file_name VARCHAR(255);

-- Add comment to describe the column
COMMENT ON COLUMN games.file_name IS 'JavaScript file name for the game implementation';
