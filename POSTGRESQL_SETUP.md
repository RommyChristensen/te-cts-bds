# PostgreSQL Integration Setup Guide

This guide explains how to set up and run the application with PostgreSQL database integration.

## Prerequisites

- Node.js (>=16.0.0)
- PostgreSQL (>=12.0)
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database for the application:

```sql
CREATE DATABASE game_database;
CREATE USER game_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE game_database TO game_user;
```

### 3. Environment Configuration

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit the `.env` file with your database credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://game_user:your_password@localhost:5432/game_database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=game_database
DB_USER=game_user
DB_PASSWORD=your_password

# Node Environment
NODE_ENV=development
PORT=3000

# Session Secret
SESSION_SECRET=game-secret-key
```

### 4. Run Database Migrations

```bash
npm run migrate
```

This will:
- Create all necessary tables
- Set up indexes and triggers
- Seed initial data (users, admins, games)

### 5. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Database Schema

The application uses the following tables:

- **users** - Player information
- **admins** - Administrator accounts
- **games** - Game definitions and status
- **currency** - Player currency balances
- **game_results** - Historical game results and rewards

## Deployment on Render

### 1. Update render.yaml

The `render.yaml` file is configured for PostgreSQL integration. Render will automatically:

- Create a PostgreSQL database
- Set environment variables
- Connect your application to the database

### 2. Deploy to Render

1. Connect your repository to Render
2. Render will automatically detect the `render.yaml` configuration
3. The database will be provisioned and migrations will run automatically

### 3. Environment Variables

Render automatically sets these environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` - Individual database config

## Migration System

### Creating New Migrations

1. Create a new SQL file in the `migrations/` directory with a numbered prefix:
   ```
   migrations/003_add_new_feature.sql
   ```

2. Write your SQL migration code in the file

3. Run migrations:
   ```bash
   npm run migrate
   ```

### Migration Features

- Automatic execution based on filename order
- Error handling and rollback support
- Transaction support for complex migrations
- Logging of migration progress

## Database Models

The application uses the following models:

- **UserModel** - User management operations
- **AdminModel** - Administrator operations
- **GameModel** - Game management
- **CurrencyModel** - Currency and balance operations
- **GameResultModel** - Game history and statistics

## API Changes

All API endpoints now use PostgreSQL instead of JSON files:

- User management (`/api/users/*`)
- Game management (`/api/games/*`)
- Currency operations (`/api/currency/*`)
- Real-time updates via Socket.IO

## Testing the Integration

### 1. Verify Database Connection

Check the server logs for:
```
Connected to PostgreSQL database
```

### 2. Test API Endpoints

```bash
# Test user login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "player001"}'

# Test standings
curl http://localhost:3000/api/standings

# Test currency
curl http://localhost:3000/api/currency
```

### 3. Test Real-time Features

Open the application in multiple browser windows to test:
- Real-time currency updates
- Game state synchronization
- Player status updates

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure PostgreSQL is running and credentials are correct
2. **Migration errors**: Check SQL syntax and database permissions
3. **Environment variables**: Verify `.env` file exists and is properly configured

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=*
```

## Performance Considerations

- Database connections are pooled (max 20 connections)
- Indexes are created on frequently queried columns
- Real-time updates use Socket.IO for efficiency
- Currency operations use database transactions

## Security Notes

- Use strong passwords in production
- Enable SSL for database connections in production
- Regularly backup your database
- Monitor database performance and query times
