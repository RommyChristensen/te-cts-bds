const db = require('../config/database');

class CurrencyModel {
  // Get all currency records
  static async getAll() {
    const result = await db.query(`
      SELECT c.*, u.nama, u.tim 
      FROM currency c 
      JOIN users u ON c.username = u.username 
      ORDER BY c.amount DESC, c.username
    `);
    return result.rows;
  }

  // Get currency by username
  static async getByUsername(username) {
    const result = await db.query('SELECT * FROM currency WHERE username = $1', [username]);
    return result.rows[0];
  }

  // Create or update currency for user
  static async setCurrency(username, amount) {
    const result = await db.query(`
      INSERT INTO currency (username, amount) 
      VALUES ($1, $2) 
      ON CONFLICT (username) 
      DO UPDATE SET amount = $2, updated_at = CURRENT_TIMESTAMP 
      RETURNING *
    `, [username, amount]);
    return result.rows[0];
  }

  // Add currency to user
  static async addCurrency(username, amountToAdd) {
    // First get current amount or create if doesn't exist
    const current = await this.getByUsername(username);
    const currentAmount = current ? current.amount : 0;
    const newAmount = Math.max(0, currentAmount + amountToAdd);
    
    return await this.setCurrency(username, newAmount);
  }

  // Get users with currency and online status
  static async getUsersWithCurrency(onlineUsers = []) {
    const result = await db.query(`
      SELECT u.*, COALESCE(c.amount, 0) as currency,
        CASE WHEN u.username = ANY($1) THEN 'online' ELSE 'offline' END as status
      FROM users u 
      LEFT JOIN currency c ON u.username = c.username 
      ORDER BY u.username
    `, [onlineUsers]);
    return result.rows;
  }

  // Get currency statistics
  static async getStats() {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_players,
        COALESCE(SUM(amount), 0) as total_currency,
        COALESCE(AVG(amount), 0) as avg_currency,
        COALESCE(MAX(amount), 0) as max_currency
      FROM currency
    `);
    return result.rows[0];
  }
}

module.exports = CurrencyModel;
