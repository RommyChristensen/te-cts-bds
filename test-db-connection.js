const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://game_user:jxTxLF7uQ7iLIHabenv9Iv7cSOvXVBI1@dpg-d86out9kh4rs73euapcg-a.singapore-postgres.render.com/game_database_xwno',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    console.log('Connecting to Render PostgreSQL...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    console.log('Server time:', result.rows[0].now);
    
    // Test tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📋 Tables:', tables.rows.map(r => r.table_name));
    
    // Test games
    const games = await pool.query('SELECT COUNT(*) FROM games');
    console.log('🎮 Games count:', games.rows[0].count);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
