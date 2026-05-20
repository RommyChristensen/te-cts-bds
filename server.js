const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'game-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Load data from JSON files
let users = [];
let admins = [];
let games = [];
let activeGame = null;
let playerCurrency = {};

// Load initial data
function loadData() {
  try {
    if (fs.existsSync('data/users.json')) {
      users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
    }
    if (fs.existsSync('data/admins.json')) {
      admins = JSON.parse(fs.readFileSync('data/admins.json', 'utf8'));
    }
    if (fs.existsSync('data/games.json')) {
      games = JSON.parse(fs.readFileSync('data/games.json', 'utf8'));
    }
    if (fs.existsSync('data/currency.json')) {
      playerCurrency = JSON.parse(fs.readFileSync('data/currency.json', 'utf8'));
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to JSON files
function saveData() {
  try {
    if (!fs.existsSync('data')) {
      fs.mkdirSync('data');
    }
    fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
    fs.writeFileSync('data/admins.json', JSON.stringify(admins, null, 2));
    fs.writeFileSync('data/games.json', JSON.stringify(games, null, 2));
    fs.writeFileSync('data/currency.json', JSON.stringify(playerCurrency, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Initialize data
loadData();

// Game state
let gamePlayers = new Map(); // Track players in current game

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/user-dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Result page route (protected) - MUST come before /game/:gameName
app.get('/game/result', (req, res) => {
  // Allow both users and admins to access result page
  if (!req.session.user && !req.session.admin) {
    return res.redirect('/');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'game', 'result.html'));
});

// Game routes (protected)
app.get('/game/:gameName', (req, res) => {
  // Allow both users and admins to access game pages
  if (!req.session.user && !req.session.admin) {
    return res.redirect('/');
  }
  
  // Always use the universal waiting room
  res.sendFile(path.join(__dirname, 'public', 'game', 'waiting-room.html'));
});

// API Routes
app.post('/login', (req, res) => {
  const { username } = req.body;
  const user = users.find(u => u.username === username);
  
  if (user) {
    req.session.user = user;
    res.json({ success: true, user: user });
  } else {
    res.json({ success: false, message: 'Username not found' });
  }
});

app.post('/admin-login', (req, res) => {
  const { username } = req.body;
  const admin = admins.find(a => a.username === username);
  
  if (admin) {
    req.session.admin = admin;
    res.json({ success: true, admin: admin });
  } else {
    res.json({ success: false, message: 'Admin username not found' });
  }
});

app.get('/api/standings', (req, res) => {
  const activePlayers = users.filter(user => !user.eliminated);
  const standings = activePlayers
    .map(user => ({
      ...user,
      currency: playerCurrency[user.username] || 0
    }))
    .sort((a, b) => b.currency - a.currency);
  res.json(standings);
});

app.get('/api/profile/:username', (req, res) => {
  const username = req.params.username;
  const user = users.find(u => u.username === username);
  
  if (user) {
    res.json({
      ...user,
      currency: playerCurrency[username] || 0
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.get('/api/user-info', (req, res) => {
  // Allow both users and admins to access game pages
  if (!req.session.user && !req.session.admin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // For users, return user info
  if (req.session.user) {
    const user = users.find(u => u.username === req.session.user.username);
    
    if (user) {
      res.json({
        ...user,
        currency: playerCurrency[user.username] || 0
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } else if (req.session.admin) {
    // For admins, return admin info to identify them
    res.json({
      username: req.session.admin.username,
      nama: req.session.admin.nama,
      isAdmin: true,
      currency: 0
    });
  } else {
    res.json(null);
  }
});

app.get('/api/active-game', (req, res) => {
  res.json({ game: activeGame });
});

app.get('/api/admin-info', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json(req.session.admin);
});

// Admin API Routes
app.get('/api/dashboard-stats', (req, res) => {
  const onlinePlayers = Array.from(connectedUsers.values())
    .filter(user => user.userType === 'user')
    .length;
  
  res.json({
    onlinePlayers,
    activeGame,
    totalUsers: users.length,
    totalGames: games.length
  });
});

app.get('/api/games', (req, res) => {
  res.json(games);
});

app.post('/api/games', (req, res) => {
  const game = req.body;
  game.id = Date.now().toString();
  games.push(game);
  saveData();
  res.json({ success: true, game });
});

app.put('/api/games/:id', (req, res) => {
  const gameId = req.params.id;
  const gameIndex = games.findIndex(g => g.id === gameId);
  
  if (gameIndex !== -1) {
    games[gameIndex] = { ...games[gameIndex], ...req.body };
    saveData();
    res.json({ success: true, game: games[gameIndex] });
  } else {
    res.status(404).json({ message: 'Game not found' });
  }
});

app.delete('/api/games/:id', (req, res) => {
  const gameId = req.params.id;
  games = games.filter(g => g.id !== gameId);
  saveData();
  res.json({ success: true });
});

app.post('/api/set-active-game/:id', (req, res) => {
  const gameId = req.params.id;
  
  // Set all games to inactive first
  games.forEach(game => {
    game.status = 'inactive';
  });
  
  // Set the selected game as active
  const gameIndex = games.findIndex(g => g.id === gameId);
  if (gameIndex !== -1) {
    games[gameIndex].status = 'active';
    activeGame = games[gameIndex];
  } else {
    activeGame = null;
  }
  
  saveData();
  
  // Emit real-time update
  io.emit('game-status-changed', { game: activeGame });
  io.emit('game-activity', { type: 'game_activated', game: activeGame });
  
  res.json({ success: true, activeGame });
});

app.post('/api/set-inactive-game/:id', (req, res) => {
  const gameId = req.params.id;
  
  // Set the selected game as inactive
  const gameIndex = games.findIndex(g => g.id === gameId);
  if (gameIndex !== -1) {
    games[gameIndex].status = 'inactive';
    
    // Clear active game if this was the active one
    if (activeGame && activeGame.id === gameId) {
      activeGame = null;
    }
  }
  
  saveData();
  
  // Clear game players
  gamePlayers.clear();
  
  // Emit real-time update
  io.emit('game-status-changed', { game: activeGame });
  io.emit('game-activity', { type: 'game_deactivated', game: null });
  io.emit('game-ended', { game: null }); // Notify all players that game ended
  
  res.json({ success: true, activeGame });
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const user = req.body;
  users.push(user);
  saveData();
  res.json({ success: true, user });
});

app.put('/api/users/:username', (req, res) => {
  const username = req.params.username;
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...req.body };
    saveData();
    res.json({ success: true, user: users[userIndex] });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.delete('/api/users/:username', (req, res) => {
  const username = req.params.username;
  users = users.filter(u => u.username !== username);
  saveData();
  res.json({ success: true });
});

app.post('/api/currency/:username', (req, res) => {
  const username = req.params.username;
  const { amount } = req.body;
  
  if (!playerCurrency[username]) {
    playerCurrency[username] = 0;
  }
  
  playerCurrency[username] += amount;
  if (playerCurrency[username] < 0) {
    playerCurrency[username] = 0;
  }
  
  saveData();
  
  // Emit real-time update
  io.emit('currency-change', { username, amount: playerCurrency[username] });
  
  res.json({ success: true, currency: playerCurrency[username] });
});

app.get('/api/currency', (req, res) => {
  // Combine user data with currency data
  const usersWithCurrency = users.map(user => ({
    ...user,
    currency: playerCurrency[user.username] || 0
  }));
  
  res.json(usersWithCurrency);
});

app.get('/api/players', (req, res) => {
  // Combine user data with currency and online status
  const onlineUsers = Array.from(connectedUsers.values())
    .filter(user => user.userType === 'user')
    .map(user => user.username);
  
  const playersWithStatus = users.map(user => ({
    ...user,
    currency: playerCurrency[user.username] || 0,
    status: onlineUsers.includes(user.username) ? 'online' : 'offline'
  }));
  
  res.json(playersWithStatus);
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Add universal event listener for debugging
  try {
    socket.onAny((eventName, ...args) => {
      console.log(`🔍 Server received event: ${eventName} from ${socket.username || 'unknown'}`, args);
    });
  } catch (error) {
    console.log('⚠️ socket.onAny not supported, using manual event listeners');
  }
  
  // Manual event listeners for debugging
  const originalEmit = socket.emit;
  socket.emit = function(event, ...args) {
    console.log(`📤 Socket emitting: ${event}`, args);
    return originalEmit.call(this, event, ...args);
  };
  
  socket.on('authenticate', (data) => {
    const { userType, username } = data;
    socket.userType = userType;
    socket.username = username;
    
    connectedUsers.set(socket.id, { userType, username });
    
    console.log(`🔐 User authenticated: ${username} (${userType})`);
    console.log(`🔐 Socket ID: ${socket.id}`);
    console.log(`🔐 Socket userType set to: ${socket.userType}`);
    console.log(`🔐 Socket username set to: ${socket.username}`);
    console.log(`🔐 Connected users: ${connectedUsers.size}`);
    
    io.emit('online-count-updated', { count: connectedUsers.size });
    io.emit('user-status-changed', { userType, username, status: 'online' });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      io.emit('online-count-updated', { count: connectedUsers.size });
      
      // Notify admin dashboard about user status change
      io.emit('user-status-changed', { userType: user.userType, username: user.username, status: 'offline' });
      
      // Remove from game if player was in game
      if (gamePlayers.has(user.username)) {
        const playerData = gamePlayers.get(user.username);
        gamePlayers.delete(user.username);
        
        console.log('Player removed from game on disconnect:', user.username);
        console.log('Current game players:', Array.from(gamePlayers.keys()));
        
        // Notify game room about player leaving
        io.to('game-room').emit('player-left', { user: playerData });
        io.emit('game-activity', { type: 'player_left', data: { user: playerData } });
        
        // Send updated player list to game room
        io.to('game-room').emit('players-updated', {
          players: Array.from(gamePlayers.values())
        });
      }
    }
  });
  
  socket.on('join-game', (data) => {
    socket.join('game-room');
    
    console.log(`User joining game room: ${data.user?.username} (${socket.userType})`);
    
    // Add player to game tracking (but not admins)
    if (data.user && !gamePlayers.has(data.user.username) && socket.userType !== 'admin') {
      gamePlayers.set(data.user.username, {
        ...data.user,
        joinedAt: new Date(),
        socketId: socket.id
      });
      
      console.log('Player joined game:', data.user.username);
      console.log('Current game players:', Array.from(gamePlayers.keys()));
      
      // Notify about player joining
      socket.broadcast.to('game-room').emit('player-joined', data);
      io.emit('game-activity', { type: 'player_joined', data });
    } else if (socket.userType === 'admin') {
      console.log('Admin joined game room for monitoring:', data.user?.username);
      // Don't add admin to gamePlayers, but still notify
      socket.broadcast.to('game-room').emit('admin-joined', data);
    }
    
    // Send updated player list to game room
    io.to('game-room').emit('players-updated', {
      players: Array.from(gamePlayers.values())
    });
  });
  
  socket.on('leave-game', (data) => {
    socket.leave('game-room');
    
    // Remove player from game tracking
    if (data.user && gamePlayers.has(data.user.username)) {
      gamePlayers.delete(data.user.username);
      console.log('Player left game:', data.user.username);
      
      // Send updated player list to game room
      io.to('game-room').emit('players-updated', {
        players: Array.from(gamePlayers.values())
      });
    }
    
    socket.broadcast.to('game-room').emit('player-left', data);
    io.emit('game-activity', { type: 'player_left', data });
  });

  socket.on('start-game', (data) => {
    if (socket.userType === 'admin') {
      io.emit('game-started', { game: activeGame });
      io.emit('game-activity', { type: 'game_started', game: activeGame });
      console.log('Game started by admin:', socket.username);
    }
  });

  socket.on('end-game', (data) => {
    if (socket.userType === 'admin') {
      console.log('Game ended by admin:', socket.username);
      
      // Don't set game to inactive here - keep it active for result page
      // Only set inactive when admin closes the room
      
      // Emit events
      io.emit('game-ended', { game: activeGame });
      io.emit('game-activity', { type: 'game_ended', game: activeGame });
      
      console.log('📡 Game-ended events sent to all clients');
      console.log('🔄 Game remains active for result page access');
    }
  });

  socket.on('distribute-rewards', (data) => {
    console.log('🎁 distribute-rewards event received from:', socket.username);
    console.log('🎁 Socket user type:', socket.userType);
    console.log('🎁 Event data:', data);
    console.log('🎁 Socket ID:', socket.id);
    console.log('🎁 Connected users size:', connectedUsers.size);
    
    if (socket.userType === 'admin') {
      console.log('🎁 Admin distributing rewards:', data);
      console.log(`📊 Current game players: ${gamePlayers.size}`);
      
      const { rewards, totalDistributed } = data;
      const distributedPlayers = [];
      
      // Log all current players
      console.log('👥 Current players in game:');
      gamePlayers.forEach((player, username) => {
        console.log(`  - ${player.nama} (${username}) from ${player.tim}`);
      });
      
      // Log rewards to distribute
      console.log('💰 Rewards to distribute:');
      Object.entries(rewards).forEach(([teamName, rewardData]) => {
        const amount = rewardData.amount || rewardData;
        const rank = rewardData.rank || 0;
        console.log(`  - ${teamName}: ${amount} coins (Rank #${rank})`);
      });
      
      // Distribute rewards to players with ranking information
      gamePlayers.forEach((player, username) => {
        console.log(`🔍 Checking player ${player.nama} from team ${player.tim}`);
        
        if (player.tim && rewards[player.tim]) {
          const teamReward = rewards[player.tim].amount || rewards[player.tim];
          const teamRank = rewards[player.tim].rank || 0;
          const teamPlayers = Array.from(gamePlayers.values()).filter(p => p.tim === player.tim);
          const perPlayerReward = Math.floor(teamReward / teamPlayers.length);
          
          console.log(`💰 Team ${player.tim} reward: ${teamReward} coins, ${teamPlayers.length} players, ${perPlayerReward} coins each`);
          
          if (perPlayerReward > 0) {
            // Update player currency
            const oldBalance = playerCurrency[username] || 0;
            playerCurrency[username] = oldBalance + perPlayerReward;
            
            distributedPlayers.push({
              username: username,
              nama: player.nama,
              tim: player.tim,
              reward: perPlayerReward,
              rank: teamRank
            });
            
            const rankEmoji = teamRank === 1 ? '🥇' : teamRank === 2 ? '🥈' : teamRank === 3 ? '🥉' : '🏅';
            console.log(`✅ ${player.nama} (${player.tim}) Rank #${teamRank}: ${oldBalance} → ${playerCurrency[username]} coins (+${perPlayerReward}) ${rankEmoji}`);
          } else {
            console.log(`⚠️ ${player.nama} gets 0 coins (perPlayerReward = ${perPlayerReward})`);
          }
        } else {
          console.log(`❌ ${player.nama} (${player.tim}) - no reward configured for team ${player.tim}`);
        }
      });
      
      // Save currency data
      console.log('💾 Saving currency data...');
      saveData();
      console.log('✅ Currency data saved');
      
      // Clear game players after distribution
      gamePlayers.clear();
      console.log('🧹 Game players cleared after reward distribution');
      
      // Notify all clients about rewards with ranking
      console.log('📡 Broadcasting rewards to all clients...');
      console.log('📊 Connected clients:', connectedUsers.size);
      console.log('📡 Broadcasting to all sockets...');
      
      const rewardsData = {
        rewards: rewards,
        totalDistributed: totalDistributed,
        players: distributedPlayers
      };
      
      console.log('📦 Rewards data to broadcast:', JSON.stringify(rewardsData, null, 2));
      
      io.emit('rewards-distributed', rewardsData);
      console.log('✅ rewards-distributed event sent to all clients');
      
      io.emit('game-activity', { 
        type: 'rewards_distributed', 
        data: { rewards, totalDistributed, players: distributedPlayers }
      });
      console.log('✅ game-activity event sent to all clients');
      
      console.log(`🎉 SUCCESS: Rewards distributed to ${distributedPlayers.length} players, total: ${totalDistributed} coins`);
      console.log('📊 Final distributed players:');
      distributedPlayers.forEach(p => {
        const rankEmoji = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : '🏅';
        console.log(`  - ${p.nama} (${p.tim}) Rank #${p.rank}: ${p.reward} coins ${rankEmoji}`);
      });
    } else {
      console.log(`❌ Non-admin ${socket.username} attempted to distribute rewards`);
      console.log(`❌ Socket userType: ${socket.userType}`);
      console.log(`❌ Expected: admin, Got: ${socket.userType}`);
    }
  });
  
  socket.on('get-players', (data) => {
    // Send current players list to requesting socket
    socket.emit('players-updated', {
      players: Array.from(gamePlayers.values())
    });
  });

  socket.on('close-room', (data) => {
    if (socket.userType === 'admin') {
      console.log('🔐 Room closed by admin:', socket.username);
      
      // Set game to inactive in data
      if (activeGame) {
        const gameIndex = games.findIndex(g => g.id === activeGame.id);
        if (gameIndex !== -1) {
          games[gameIndex].status = 'inactive';
          console.log(`🔐 Game ${activeGame.name} set to inactive on room close`);
        }
        
        // Clear active game
        activeGame = null;
        console.log('🔐 Active game cleared on room close');
        
        // Save data
        saveData();
        console.log('💾 Game status saved on room close');
      }
      
      // Clear game players
      gamePlayers.clear();
      console.log('🧹 Game players cleared on room close');
      
      // Emit events
      io.emit('room-closed', { game: null });
      io.emit('game-activity', { type: 'room_closed', game: null });
      io.emit('game-status-changed', { game: null });
      
      console.log('📡 Room-closed events sent to all clients');
    }
  });

  // Add ping handler for testing
  socket.on('ping', (data) => {
    console.log('🏓 Ping received from:', socket.username, data);
    socket.emit('pong', { 
      message: 'pong from server', 
      received: data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('currency-updated', (data) => {
    io.emit('currency-change', data);
  });
  
  socket.on('game-status-changed', (data) => {
    io.emit('game-status-update', data);
  });
  
  socket.on('user-eliminated', (data) => {
    io.emit('elimination-update', data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
