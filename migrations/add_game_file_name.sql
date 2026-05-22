-- Add file_name column to games table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'file_name'
  ) THEN 
    ALTER TABLE games ADD COLUMN file_name VARCHAR(255);
    COMMENT ON COLUMN games.file_name IS 'JavaScript file name for the game implementation';
  END IF;
END $$;
