require('dotenv').config();
const db = require('./config/database');

async function testDatabase() {
  try {
    console.log('🔍 Testing local database connection...');
    
    // Test basic connection
    const result = await db.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL:', result.rows[0].now);
    
    // Test games table
    const games = await db.query('SELECT COUNT(*) FROM games');
    console.log('🎮 Games in database:', games.rows[0].count);
    
    // Test active game
    const activeGame = await db.query('SELECT * FROM games WHERE status = $1', ['active']);
    if (activeGame.rows.length > 0) {
      console.log('✅ Active game found:', activeGame.rows[0].name);
    } else {
      console.log('ℹ️ No active game found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await db.pool.end();
  }
}

testDatabase();
