require('dotenv').config();

console.log('🔍 Checking .env configuration:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('DB_HOST:', process.env.DB_HOST || '❌ Missing');
console.log('DB_NAME:', process.env.DB_NAME || '❌ Missing');
console.log('DB_USER:', process.env.DB_USER || '❌ Missing');

if (process.env.DATABASE_URL) {
  console.log('📋 Connection string preview:');
  console.log(process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@'));
}
