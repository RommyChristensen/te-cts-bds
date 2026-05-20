# Interactive Game Website

Website interaktif dengan Node.js, HTML, dan WebSocket yang mendukung 60-70 pengguna konkuren.

## Fitur

### User Side
- **Login** dengan username dari dataset JSON
- **Standings** - Lihat peringkat tim
- **Profil** - Lihat nama, tim, dan currency
- **Play** - Join game yang sedang aktif

### Admin Side
- **Dashboard** - Statistik game dan pemain online
- **Game Management** - Tambah, edit, hapus game
- **Player Management** - Kelola pemain online
- **Currency Management** - Atur currency pemain
- **User Management** - Kelola user terdaftar

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML, CSS, JavaScript
- **Database**: JSON files
- **Real-time**: WebSocket

## Installation

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Start production server:
   ```bash
   npm start
   ```

## Default Users

### Players
- player001 - John Doe (Team Alpha)
- player002 - Jane Smith (Team Beta)
- player003 - Mike Johnson (Team Alpha)
- ... (lihat `data/users.json`)

### Admins
- admin001 - Administrator Utama
- admin002 - Game Master
- admin003 - Event Coordinator

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /admin-login` - Admin login

### User APIs
- `GET /api/standings` - Get standings
- `GET /api/profile/:username` - Get user profile
- `GET /api/active-game` - Get active game
- `GET /api/user-info` - Get current user info

### Admin APIs
- `GET /api/dashboard-stats` - Dashboard statistics
- `GET /api/games` - Get all games
- `POST /api/games` - Add new game
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- `POST /api/set-active-game/:id` - Set active game
- `GET /api/users` - Get all users
- `POST /api/users` - Add new user
- `PUT /api/users/:username` - Update user
- `DELETE /api/users/:username` - Delete user
- `POST /api/currency/:username` - Update user currency

## WebSocket Events

### Client to Server
- `authenticate` - Authenticate user
- `join-game` - Join game room
- `leave-game` - Leave game room

### Server to Client
- `online-count-updated` - Online user count update
- `user-connected` - User connected notification
- `user-disconnected` - User disconnected notification
- `currency-change` - Currency update notification
- `game-status-update` - Game status update
- `elimination-update` - User elimination update

## Deployment ke Render

1. Buat `render.yaml` file (sudah disediakan)
2. Push ke GitHub repository
3. Connect ke Render dengan GitHub integration
4. Render akan otomatis mendeteksi dan deploy

## Performance untuk 60-70 Users

Website ini dioptimalkan untuk:
- Concurrent connections dengan Socket.IO
- Efficient JSON data storage
- Real-time updates tanpa refresh
- Minimal server load dengan event-driven architecture

## Development

### Struktur File
```
├── server.js              # Main server file
├── package.json           # Dependencies
├── data/                  # JSON data files
│   ├── users.json
│   ├── admins.json
│   ├── games.json
│   └── currency.json
├── public/                # Static files
│   ├── login.html
│   ├── admin-login.html
│   ├── user-dashboard.html
│   └── admin-dashboard.html
└── README.md
```

### Environment Variables
- `PORT` - Server port (default: 3000)

## Testing

Untuk testing dengan 60+ concurrent users, gunakan tools seperti:
- Artillery.js
- K6
- Custom load testing scripts

## License

MIT License
