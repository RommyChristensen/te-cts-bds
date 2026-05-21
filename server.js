const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Database models
const UserModel = require('./models/userModel');
const AdminModel = require('./models/adminModel');
const GameModel = require('./models/gameModel');
const CurrencyModel = require('./models/currencyModel');
const GameResultModel = require('./models/gameResultModel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/games', express.static('public/games'));
app.use('/data', express.static('data'));
app.use(session({
  secret: 'game-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Game state
let gamePlayers = new Map(); // Track players in current game
let completedPlayers = new Map(); // Track players who completed games (for rewards)
let activeGame = null;

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
  
  // Use the waiting room first
  res.sendFile(path.join(__dirname, 'public', 'game', 'waiting-room.html'));
});

// Game loader route (protected)
app.get('/game-loader', (req, res) => {
  // Allow both users and admins to access game loader
  if (!req.session.user && !req.session.admin) {
    return res.redirect('/');
  }
  
  res.sendFile(path.join(__dirname, 'public', 'game', 'game-loader.html'));
});

// API Routes
app.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await UserModel.getByUsername(username);
    
    if (user) {
      req.session.user = user;
      res.json({ success: true, user: user });
    } else {
      res.json({ success: false, message: 'Username not found' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/admin-login', async (req, res) => {
  try {
    const { username } = req.body;
    const admin = await AdminModel.getByUsername(username);
    
    if (admin) {
      req.session.admin = admin;
      res.json({ success: true, admin: admin });
    } else {
      res.json({ success: false, message: 'Admin username not found' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/standings', async (req, res) => {
  try {
    const standings = await UserModel.getActiveWithCurrency();
    res.json(standings);
  } catch (error) {
    console.error('Standings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await UserModel.getProfileWithCurrency(username);
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/user-info', async (req, res) => {
  try {
    // Allow both users and admins to access game pages
    if (!req.session.user && !req.session.admin) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // For users, return user info
    if (req.session.user) {
      const user = await UserModel.getProfileWithCurrency(req.session.user.username);
      
      if (user) {
        res.json(user);
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
  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/active-game', async (req, res) => {
  try {
    // Always fetch from database to get latest state
    const activeGame = await GameModel.getActive();
    res.json({ game: activeGame });
  } catch (error) {
    console.error('Active game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin-info', async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const admin = await AdminModel.getByUsername(req.session.admin.username);
    res.json(admin);
  } catch (error) {
    console.error('Admin info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin API Routes
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const onlinePlayers = Array.from(connectedUsers.values())
      .filter(user => user.userType === 'user')
      .length;
    
    const totalUsers = await UserModel.getAll();
    const totalGames = await GameModel.getAll();
    
    res.json({
      onlinePlayers,
      activeGame,
      totalUsers: totalUsers.length,
      totalGames: totalGames.length
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const games = await GameModel.getAll();
    res.json(games);
  } catch (error) {
    console.error('Games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/games', async (req, res) => {
  try {
    const game = req.body;
    const newGame = await GameModel.create(game);
    res.json({ success: true, game: newGame });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/games/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await GameModel.update(gameId, req.body);
    
    if (game) {
      res.json({ success: true, game });
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/games/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await GameModel.delete(gameId);
    
    if (game) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/set-active-game/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Set all games to inactive first
    await GameModel.updateAll({ status: 'inactive' });
    
    // Set the selected game as active
    activeGame = await GameModel.setActive(gameId);
    
    // Emit real-time update
    io.emit('game-status-changed', { game: activeGame });
    io.emit('game-activity', { type: 'game_activated', game: activeGame });
    
    res.json({ success: true, activeGame });
  } catch (error) {
    console.error('Set active game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/set-inactive-game/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Set the selected game as inactive
    await GameModel.setInactive(gameId);
    
    // Clear active game if this was the active one
    if (activeGame && activeGame.id === gameId) {
      activeGame = null;
    }
    
    // Clear game players
    gamePlayers.clear();
    
    // Emit real-time update
    io.emit('game-status-changed', { game: activeGame });
    io.emit('game-activity', { type: 'game_deactivated', game: null });
    io.emit('game-ended', { game: null }); // Notify all players that game ended
    
    res.json({ success: true, activeGame });
  } catch (error) {
    console.error('Set inactive game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await UserModel.getAll();
    res.json(users);
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    const newUser = await UserModel.create(user);
    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await UserModel.update(username, req.body);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await UserModel.delete(username);
    
    if (user) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/currency/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const { amount } = req.body;
    
    const currency = await CurrencyModel.addCurrency(username, amount);
    
    // Emit real-time update
    io.emit('currency-change', { username, amount: currency.amount });
    
    res.json({ success: true, currency: currency.amount });
  } catch (error) {
    console.error('Currency error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/currency', async (req, res) => {
  try {
    const usersWithCurrency = await UserModel.getAllWithCurrency();
    res.json(usersWithCurrency);
  } catch (error) {
    console.error('Currency list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    // Get online usernames
    const onlineUsers = Array.from(connectedUsers.values())
      .filter(user => user.userType === 'user')
      .map(user => user.username);
    
    const playersWithStatus = await CurrencyModel.getUsersWithCurrency(onlineUsers);
    res.json(playersWithStatus);
  } catch (error) {
    console.error('Players error:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
      
      // Emit game progress update to all
      io.emit('game-progress', { 
        gameStatus: 'starting',
        teamProgress: {}
      });
      
      // Redirect only players (not admin) to game loader
      socket.broadcast.emit('redirect-to-game', { url: '/game-loader' });
      console.log('Redirecting players to game loader, admin stays for monitoring');
    }
  });

  socket.on('game-progress', (data) => {
    console.log('Game progress update:', data);
    // Broadcast progress to all clients
    io.emit('game-progress', data);
  });

  socket.on('answer-submitted', (data) => {
    console.log('🎯 Answer submitted:', data);
    
    // Add to completed players if answer is correct and not already tracked
    if (data.correct && !completedPlayers.has(data.user.username)) {
      completedPlayers.set(data.user.username, {
        ...data.user,
        team: data.teamName || data.user.tim,
        completedAt: Date.now(),
        answer: data.answer,
        time: data.time
      });
      console.log(`✅ Player ${data.user.nama} (${data.user.username}) added to completed players`);
      console.log(`📊 Total completed players: ${completedPlayers.size}`);
    }
    
    // Broadcast to all clients for immediate admin notification
    io.emit('answer-submitted', data);
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

  socket.on('distribute-rewards', async (data) => {
    console.log('🎁 distribute-rewards event received from:', socket.username);
    console.log('🎁 Socket user type:', socket.userType);
    console.log('🎁 Event data:', data);
    console.log('🎁 Socket ID:', socket.id);
    console.log('🎁 Connected users size:', connectedUsers.size);
    
    if (socket.userType === 'admin') {
      try {
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
        
        // Use completedPlayers if gamePlayers is empty (players may have disconnected)
        const playersToReward = gamePlayers.size > 0 ? gamePlayers : completedPlayers;
        
        console.log(`📊 Using ${playersToReward === gamePlayers ? 'gamePlayers' : 'completedPlayers'} for reward distribution`);
        console.log(`👥 Players to reward: ${playersToReward.size}`);
        
        // Distribute rewards to players with ranking information
        for (const [username, player] of playersToReward) {
          console.log(`🔍 Checking player ${player.nama} from team ${player.team || player.tim}`);
          
          const playerTeam = player.team || player.tim;
          if (playerTeam && rewards[playerTeam]) {
            const teamReward = rewards[playerTeam].amount || rewards[playerTeam];
            const teamRank = rewards[playerTeam].rank || 0;
            const teamPlayers = Array.from(playersToReward.values()).filter(p => (p.team || p.tim) === playerTeam);
            const perPlayerReward = Math.floor(teamReward / teamPlayers.length);
            
            console.log(`💰 Team ${playerTeam} reward: ${teamReward} coins, ${teamPlayers.length} players, ${perPlayerReward} coins each`);
            
            if (perPlayerReward > 0) {
              // Update player currency in database
              const currency = await CurrencyModel.addCurrency(username, perPlayerReward);
              const oldBalance = currency.amount - perPlayerReward;
              
              // Create game result record
              if (activeGame) {
                await GameResultModel.create({
                  game_id: activeGame.id,
                  username: username,
                  team: playerTeam,
                  rank: teamRank,
                  reward: perPlayerReward
                });
              }
              
              // Emit currency change to update player's balance in real-time
              io.emit('currency-change', { 
                username: username, 
                amount: currency.amount,
                oldBalance: oldBalance,
                change: perPlayerReward,
                reason: 'reward'
              });
              
              distributedPlayers.push({
                username: username,
                nama: player.nama,
                tim: playerTeam,
                reward: perPlayerReward,
                rank: teamRank
              });
              
              const rankEmoji = teamRank === 1 ? '🥇' : teamRank === 2 ? '🥈' : teamRank === 3 ? '🥉' : '🏅';
              console.log(`✅ ${player.nama} (${playerTeam}) Rank #${teamRank}: ${oldBalance} → ${currency.amount} coins (+${perPlayerReward}) ${rankEmoji}`);
            } else {
              console.log(`⚠️ ${player.nama} gets 0 coins (perPlayerReward = ${perPlayerReward})`);
            }
          } else {
            console.log(`❌ ${player.nama} (${playerTeam}) - no reward configured for team ${playerTeam}`);
          }
        }
        
        // Clear game players after distribution
        gamePlayers.clear();
        completedPlayers.clear();
        console.log('🧹 Game players and completed players cleared after reward distribution');
        
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
      } catch (error) {
        console.error('❌ Error distributing rewards:', error);
        socket.emit('error', { message: 'Failed to distribute rewards' });
      }
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

  socket.on('close-room', async (data) => {
    if (socket.userType === 'admin') {
      try {
        console.log('🔐 Room closed by admin:', socket.username);
        
        // Set game to inactive in database
        if (activeGame) {
          await GameModel.setInactive(activeGame.id);
          console.log(`🔐 Game ${activeGame.name} set to inactive on room close`);
          
          // Clear active game
          activeGame = null;
          console.log('🔐 Active game cleared on room close');
        }
        
        // Clear game players
        gamePlayers.clear();
        console.log('🧹 Game players cleared on room close');
        
        // Emit events
        io.emit('room-closed', { game: null });
        io.emit('game-activity', { type: 'room_closed', game: null });
        io.emit('game-status-changed', { game: null });
        
        console.log('📡 Room-closed events sent to all clients');
      } catch (error) {
        console.error('❌ Error closing room:', error);
        socket.emit('error', { message: 'Failed to close room' });
      }
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
