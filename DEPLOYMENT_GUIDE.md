# Render Deployment Guide

## Automatic Migration Deployment

Your `render.yaml` is already configured to run migrations automatically:

```yaml
buildCommand: npm install && npm run migrate
```

### Steps:

1. **Push Changes to Git**
   ```bash
   git add .
   git commit -m "Add user fields migration"
   git push origin main
   ```

2. **Render Will Automatically**
   - Run `npm install`
   - Execute `npm run migrate` (runs all .sql files in /migrations)
   - Start the application with `npm start`

3. **Monitor Deployment**
   - Check Render dashboard for deployment status
   - View build logs for migration output

### Manual Migration (if needed)

If you need to run migrations manually:

1. **Render Shell Access**
   - Go to Render dashboard
   - Select your service
   - Click "Shell" tab
   - Run: `npm run migrate`

2. **Or Trigger New Deploy**
   - In Render dashboard
   - Click "Manual Deploy"
   - Choose "Deploy latest commit"

### Migration Files

Your migration will run automatically:
- `/migrations/add_user_fields.sql`

### Verification

After deployment, verify new columns exist:
```sql
-- Connect to Render PostgreSQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('name', 'initial', 'gender', 'bds_team', 'birthdate', 'player_id');
```

### Troubleshooting

If migration fails:
1. Check build logs in Render dashboard
2. Verify SQL syntax is valid
3. Ensure database connection is working
4. Manual run via Shell for detailed error logs
