const io = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const CONCURRENT_USERS = 70;
const TEST_DURATION = 60; // seconds

// Test data
const testUsers = Array.from({ length: CONCURRENT_USERS }, (_, i) => ({
  username: `testuser${i + 1}`,
  nama: `Test User ${i + 1}`,
  tim: `Team ${String.fromCharCode(65 + (i % 3))}`, // Team A, B, C
  eliminated: false
}));

// Statistics
let connectedUsers = 0;
let disconnectedUsers = 0;
let messagesReceived = 0;
let latencies = [];
let startTime = Date.now();

console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users...`);
console.log(`Test duration: ${TEST_DURATION} seconds`);

// Function to simulate a user
function simulateUser(user) {
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    const userStartTime = Date.now();
    
    socket.on('connect', () => {
      const connectTime = Date.now() - userStartTime;
      latencies.push(connectTime);
      
      connectedUsers++;
      console.log(`User ${user.username} connected (${connectedUsers}/${CONCURRENT_USERS})`);
      
      // Authenticate as user
      socket.emit('authenticate', { userType: 'user', username: user.username });
      
      // Simulate user activity
      const activityInterval = setInterval(() => {
        // Random activities
        const activities = [
          () => socket.emit('join-game', { user }),
          () => socket.emit('leave-game', { user }),
          () => console.log(`User ${user.username} is active`)
        ];
        
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        randomActivity();
      }, Math.random() * 10000 + 5000); // Random interval between 5-15 seconds
      
      // Disconnect after test duration
      setTimeout(() => {
        clearInterval(activityInterval);
        socket.disconnect();
      }, TEST_DURATION * 1000);
    });
    
    socket.on('disconnect', () => {
      disconnectedUsers++;
      console.log(`User ${user.username} disconnected (${disconnectedUsers}/${CONCURRENT_USERS})`);
      resolve();
    });
    
    socket.on('currency-change', (data) => {
      messagesReceived++;
      console.log(`User ${user.username} received currency update:`, data);
    });
    
    socket.on('game-status-update', (data) => {
      messagesReceived++;
      console.log(`User ${user.username} received game status update:`, data);
    });
    
    socket.on('online-count-updated', (data) => {
      messagesReceived++;
      console.log(`User ${user.username} received online count update:`, data);
    });
    
    socket.on('connect_error', (error) => {
      console.error(`User ${user.username} connection error:`, error.message);
      resolve();
    });
  });
}

// Run the test
async function runLoadTest() {
  console.log('Connecting users...');
  
  // Connect all users concurrently
  const userPromises = testUsers.map(user => simulateUser(user));
  
  // Wait for all users to complete
  await Promise.all(userPromises);
  
  // Calculate statistics
  const endTime = Date.now();
  const totalTestTime = (endTime - startTime) / 1000;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);
  
  console.log('\n=== LOAD TEST RESULTS ===');
  console.log(`Test Duration: ${totalTestTime.toFixed(2)} seconds`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Connected Users: ${connectedUsers}`);
  console.log(`Disconnected Users: ${disconnectedUsers}`);
  console.log(`Messages Received: ${messagesReceived}`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`Max Latency: ${maxLatency}ms`);
  console.log(`Min Latency: ${minLatency}ms`);
  console.log(`Messages per Second: ${(messagesReceived / totalTestTime).toFixed(2)}`);
  
  process.exit(0);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the test
runLoadTest();
