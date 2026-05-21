const db = require('../config/database');

class UserModel {
  // Get all users
  static async getAll() {
    const result = await db.query('SELECT * FROM users ORDER BY username');
    return result.rows;
  }

  // Get user by username
  static async getByUsername(username) {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  }

  // Create new user
  static async create(user) {
    const { 
      username, 
      nama, 
      tim, 
      eliminated = false,
      name = null,
      initial = null,
      gender = null,
      bds_team = null,
      birthdate = null,
      player_id = null
    } = user;
    const result = await db.query(
      'INSERT INTO users (username, nama, tim, eliminated, name, initial, gender, bds_team, birthdate, player_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [username, nama, tim, eliminated, name, initial, gender, bds_team, birthdate, player_id]
    );
    return result.rows[0];
  }

  // Update user
  static async update(username, updates) {
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

    values.push(username);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE username = $${paramCount} RETURNING *`;
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Delete user
  static async delete(username) {
    const result = await db.query('DELETE FROM users WHERE username = $1 RETURNING *', [username]);
    return result.rows[0];
  }

  // Get users with currency
  static async getAllWithCurrency() {
    const result = await db.query(`
      SELECT u.*, COALESCE(c.amount, 0) as currency 
      FROM users u 
      LEFT JOIN currency c ON u.username = c.username 
      ORDER BY u.username
    `);
    return result.rows;
  }

  // Get active users (not eliminated) with currency for standings
  static async getActiveWithCurrency() {
    const result = await db.query(`
      SELECT u.*, COALESCE(c.amount, 0) as currency 
      FROM users u 
      LEFT JOIN currency c ON u.username = c.username 
      WHERE u.eliminated = false 
      ORDER BY c.amount DESC, u.username
    `);
    return result.rows;
  }

  // Get user profile with currency
  static async getProfileWithCurrency(username) {
    const result = await db.query(`
      SELECT u.*, COALESCE(c.amount, 0) as currency 
      FROM users u 
      LEFT JOIN currency c ON u.username = c.username 
      WHERE u.username = $1
    `, [username]);
    return result.rows[0];
  }
}

module.exports = UserModel;
