# The Master Integration Game Setup

## Overview
"The Master Integration" adalah game fase 2 yang menggabungkan hasil dari 3 game sebelumnya (Signal Decoder, Logic Lock, Sequence Master). Player harus menyelesaikan ekspresi matematika untuk mencapai target angka.

## Files Created

### 1. Game Data
- **`/data/master-integration-questions.json`** - Berisi soal per team dengan 3 angka dan target result

### 2. Game Logic
- **`/public/games/master-integration.js`** - Game implementation dengan canvas UI (tema beige/pastel)

### 3. Setup Scripts
- **`add-master-integration-game.js`** - Script untuk menambah game ke database (memerlukan koneksi langsung)
- **`update-master-integration-url.js`** - Script untuk update game_url
- **`add-master-integration-via-api.sh`** - Shell script untuk menambah game via API (recommended)

## Setup Instructions

### Step 1: Start the Server
```bash
npm start
```

### Step 2: Add Game via API (in another terminal)
```bash
bash add-master-integration-via-api.sh
```

Atau gunakan curl langsung:
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "id": "master-integration-'$(date +%s)'",
    "name": "The Master Integration",
    "description": "Solve mathematical expressions to reach the target result using given numbers and operators.",
    "status": "inactive",
    "duration": 600,
    "reward_coins": 50,
    "file_name": "master-integration.js",
    "game_url": "/game/the-master-integration",
    "teams": [
      {"name": "Team 1", "players": 1},
      {"name": "Team 2", "players": 1},
      {"name": "Team 3", "players": 1},
      {"name": "Team 4", "players": 1},
      {"name": "Team 5", "players": 1},
      {"name": "Team 6", "players": 1},
      {"name": "Team 7", "players": 1},
      {"name": "Team 8", "players": 1},
      {"name": "Team 9", "players": 1},
      {"name": "Team 10", "players": 1},
      {"name": "Team 11", "players": 1},
      {"name": "Team 12", "players": 1}
    ]
  }'
```

### Step 3: Activate Game
1. Go to Admin Dashboard (`/admin-dashboard`)
2. Find "The Master Integration" game
3. Click "Activate" to set it as active

## Game Mechanics

### Player Flow
1. Player joins waiting room
2. Admin starts game
3. Player sees:
   - **Target Result**: Angka yang harus dicapai
   - **3 Numbers**: Angka-angka yang sudah ditentukan (3-digit each)
   - **Operators**: +, -, ×, ÷, (, )
4. Player clicks numbers dan operators untuk membuat ekspresi
5. Player submit jawaban
6. If correct → "✓ Correct Answer!" dan game selesai
7. If wrong → "✗ Wrong Answer" tanpa reveal jawaban

### Example
```
Given Numbers: 100, 50, 25
Target: 150

Valid Solutions:
- 100 + 50 = 150 ✓
- (100 + 50) × 25 = 3750 ✗
- 100 + 50 - 25 = 125 ✗
```

## UI Theme
- **Background**: Warm Beige (#FFF8F0)
- **Primary**: Light Beige (#F5E6D3)
- **Secondary**: Warm Tan (#E8D4C4)
- **Accent**: Dusty Rose (#D4A5A5)
- **Correct**: Soft Green (#A8D5BA)
- **Wrong**: Soft Red (#F4A9A8)

## Features
- ✅ Canvas-based UI (responsive untuk mobile)
- ✅ Real-time timer tracking
- ✅ Mathematical expression evaluation dengan proper operator precedence
- ✅ Support untuk parentheses
- ✅ Unlimited attempts
- ✅ Team-specific questions
- ✅ Socket.IO integration untuk real-time updates

## Testing
1. Login sebagai player
2. Join game "The Master Integration"
3. Tunggu admin start game
4. Try different combinations of numbers dan operators
5. Submit answer ketika sudah yakin
