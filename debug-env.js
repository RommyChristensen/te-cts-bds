require('dotenv').config();

console.log('🔍 Current .env configuration:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.DATABASE_URL) {
  console.log('📋 Full connection string:');
  console.log(process.env.DATABASE_URL);
  
  if (process.env.DATABASE_URL.includes('render.com')) {
    console.log('✅ This is a Render database connection');
  } else {
    console.log('❌ This is NOT a Render database connection');
  }
} else {
  console.log('❌ No DATABASE_URL found - check your .env file');
}
