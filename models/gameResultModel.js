const db = require('../config/database');

class GameResultModel {
  // Create game result
  static async create(result) {
    const { game_id, username, team, rank, reward } = result;
    const query = `
      INSERT INTO game_results (game_id, username, team, rank, reward) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const dbResult = await db.query(query, [game_id, username, team, rank, reward]);
    return dbResult.rows[0];
  }

  // Get results by game ID
  static async getByGameId(gameId) {
    const result = await db.query(`
      SELECT gr.*, u.nama 
      FROM game_results gr 
      JOIN users u ON gr.username = u.username 
      WHERE gr.game_id = $1 
      ORDER BY gr.rank, gr.username
    `, [gameId]);
    return result.rows;
  }

  // Get results by username
  static async getByUsername(username) {
    const result = await db.query(`
      SELECT gr.*, g.name as game_name 
      FROM game_results gr 
      JOIN games g ON gr.game_id = g.id 
      WHERE gr.username = $1 
      ORDER BY gr.created_at DESC
    `, [username]);
    return result.rows;
  }

  // Get all game results
  static async getAll() {
    const result = await db.query(`
      SELECT gr.*, u.nama, g.name as game_name 
      FROM game_results gr 
      JOIN users u ON gr.username = u.username 
      JOIN games g ON gr.game_id = g.id 
      ORDER BY gr.created_at DESC, gr.rank
    `);
    return result.rows;
  }

  // Get leaderboard by total rewards
  static async getLeaderboard(limit = 10) {
    const result = await db.query(`
      SELECT 
        u.username,
        u.nama,
        u.tim,
        COALESCE(SUM(gr.reward), 0) as total_rewards,
        COUNT(*) as games_played
      FROM users u
      LEFT JOIN game_results gr ON u.username = gr.username
      GROUP BY u.username, u.nama, u.tim
      ORDER BY total_rewards DESC, games_played DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  // Delete results by game ID
  static async deleteByGameId(gameId) {
    const result = await db.query(
      'DELETE FROM game_results WHERE game_id = $1 RETURNING *',
      [gameId]
    );
    return result.rows;
  }
}

module.exports = GameResultModel;
