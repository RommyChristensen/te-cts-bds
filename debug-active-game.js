require('dotenv').config();
const GameModel = require('./models/gameModel');

async function debugActiveGame() {
  try {
    console.log('🔍 Debugging active game...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    // Test database connection
    const allGames = await GameModel.getAll();
    console.log('📋 All games:', allGames.length);
    
    // Test active game
    const activeGame = await GameModel.getActive();
    console.log('🎮 Active game:', activeGame ? activeGame.name : 'None');
    
    if (activeGame) {
      console.log('✅ Active game details:', {
        id: activeGame.id,
        name: activeGame.name,
        status: activeGame.status
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugActiveGame();
