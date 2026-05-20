const db = require('../config/database');

class AdminModel {
  // Get all admins
  static async getAll() {
    const result = await db.query('SELECT * FROM admins ORDER BY username');
    return result.rows;
  }

  // Get admin by username
  static async getByUsername(username) {
    const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
    return result.rows[0];
  }

  // Create new admin
  static async create(admin) {
    const { username, nama } = admin;
    const result = await db.query(
      'INSERT INTO admins (username, nama) VALUES ($1, $2) RETURNING *',
      [username, nama]
    );
    return result.rows[0];
  }

  // Update admin
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
    const query = `UPDATE admins SET ${fields.join(', ')} WHERE username = $${paramCount} RETURNING *`;
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Delete admin
  static async delete(username) {
    const result = await db.query('DELETE FROM admins WHERE username = $1 RETURNING *', [username]);
    return result.rows[0];
  }
}

module.exports = AdminModel;
