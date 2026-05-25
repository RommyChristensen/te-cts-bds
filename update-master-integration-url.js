const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateGameUrl() {
  try {
    const query = `
      UPDATE games
      SET game_url = $1
      WHERE name = $2
      RETURNING *;
    `;
    
    const result = await pool.query(query, ['/game/the-master-integration', 'The Master Integration']);
    
    if (result.rows.length > 0) {
      console.log('✅ Game URL updated successfully:', result.rows[0]);
    } else {
      console.log('⚠️ Game not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error updating game URL:', error);
    await pool.end();
    process.exit(1);
  }
}

updateGameUrl();
