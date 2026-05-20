const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://game_user:jxTxLF7uQ7iLIHabenv9Iv7cSOvXVBI1@dpg-d86out9kh4rs73euapcg-a.singapore-postgres.render.com/game_database_xwno',
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    console.log('🚀 Running migrations on Render PostgreSQL...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`📋 Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(filePath, 'utf8');
      
      await pool.query(migrationSQL);
      console.log(`✅ Migration ${file} completed successfully`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
    // Verify setup
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📋 Created tables:', tables.rows.map(r => r.table_name));
    
    const games = await pool.query('SELECT COUNT(*) FROM games');
    console.log('🎮 Games imported:', games.rows[0].count);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();
