const db = require('../config/database');

class GameModel {
  // Get all games
  static async getAll() {
    const result = await db.query(`
      SELECT 
        g.*,
        CASE 
          WHEN COUNT(gt.team_name) = 0 THEN '[]'::json
          ELSE json_agg(
            json_build_object(
              'team_name', gt.team_name,
              'player_count', gt.player_count
            )
            ORDER BY gt.team_name
          )
        END as teams
      FROM games g
      LEFT JOIN game_teams gt ON g.id = gt.game_id
      GROUP BY g.id
      ORDER BY g.created_at
    `);
    return result.rows;
  }

  // Get game by ID
  static async getById(id) {
    const result = await db.query(`
      SELECT 
        g.*,
        CASE 
          WHEN COUNT(gt.team_name) = 0 THEN '[]'::json
          ELSE json_agg(
            json_build_object(
              'team_name', gt.team_name,
              'player_count', gt.player_count
            )
            ORDER BY gt.team_name
          )
        END as teams
      FROM games g
      LEFT JOIN game_teams gt ON g.id = gt.game_id
      WHERE g.id = $1
      GROUP BY g.id
    `, [id]);
    return result.rows[0];
  }

  // Create new game
  static async create(game) {
    const { 
      id, 
      name, 
      description, 
      status = 'inactive', 
      duration = 5, 
      reward_coins = 0, 
      game_url = null,
      file_name = null,
      teams = []
    } = game;
    const gameId = id || Date.now().toString();
    
    // Start transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert game
      const gameResult = await client.query(
        'INSERT INTO games (id, name, description, status, duration, reward_coins, game_url, file_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [gameId, name, description, status, duration, reward_coins, game_url, file_name]
      );
      
      // Insert teams if provided
      if (teams && teams.length > 0) {
        for (const team of teams) {
          await client.query(
            'INSERT INTO game_teams (game_id, team_name, player_count) VALUES ($1, $2, $3) ON CONFLICT (game_id, team_name) DO UPDATE SET player_count = $3',
            [gameId, team.team_name || team, team.player_count || 0]
          );
        }
      }
      
      await client.query('COMMIT');
      return await this.getById(gameId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Update game
  static async update(id, updates) {
    const { teams, ...gameUpdates } = updates;
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(gameUpdates).forEach(key => {
      if (gameUpdates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(gameUpdates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0 && !teams) {
      throw new Error('No fields to update');
    }

    // Start transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update game fields if any
      if (fields.length > 0) {
        values.push(id);
        const query = `UPDATE games SET ${fields.join(', ')} WHERE id = $${paramCount}`;
        await client.query(query, values);
      }
      
      // Update teams if provided
      if (teams) {
        // Delete existing teams
        await client.query('DELETE FROM game_teams WHERE game_id = $1', [id]);
        
        // Insert new teams
        if (teams.length > 0) {
          for (const team of teams) {
            await client.query(
              'INSERT INTO game_teams (game_id, team_name, player_count) VALUES ($1, $2, $3)',
              [id, team.team_name || team, team.player_count || 0]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      return await this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete game
  static async delete(id) {
    const result = await db.query('DELETE FROM games WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // Set game as active (deactivate all others)
  static async setActive(id) {
    await db.query('UPDATE games SET status = $1', ['inactive']);
    
    const result = await db.query(
      'UPDATE games SET status = $1 WHERE id = $2 RETURNING *',
      ['active', id]
    );
    return result.rows[0];
  }

  // Set game as inactive
  static async setInactive(id) {
    const result = await db.query(
      'UPDATE games SET status = $1 WHERE id = $2 RETURNING *',
      ['inactive', id]
    );
    return result.rows[0];
  }

  // Get active game
  static async getActive() {
    const result = await db.query(`
      SELECT 
        g.*,
        CASE 
          WHEN COUNT(gt.team_name) = 0 THEN '[]'::json
          ELSE json_agg(
            json_build_object(
              'team_name', gt.team_name,
              'player_count', gt.player_count
            )
            ORDER BY gt.team_name
          )
        END as teams
      FROM games g
      LEFT JOIN game_teams gt ON g.id = gt.game_id
      WHERE g.status = $1
      GROUP BY g.id
    `, ['active']);
    return result.rows[0];
  }

  // Update all games
  static async updateAll(updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `UPDATE games SET ${fields.join(', ')}`;
    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = GameModel;
