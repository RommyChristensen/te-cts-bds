// Efficiency Race Game
class GameInstance {
    constructor(options) {
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.socket = options.socket;
        this.user = options.user;
        this.game = options.game;
        
        this.events = {};
        this.isRunning = false;
        this.players = new Map();
        this.gameState = 'waiting';
        
        // Game specific properties
        this.cars = [];
        this.obstacles = [];
        this.checkpoints = [];
        this.currentLap = 0;
        this.maxLaps = 3;
        
        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    init() {
        console.log('Initializing Efficiency Race game...');
        console.log('User:', this.user);
        console.log('Game:', this.game);
        
        // Initialize game objects
        this.initializeGame();
        
        // Start render loop
        this.render();
        
        this.emit('ready');
    }

    initializeGame() {
        // Create player car
        this.playerCar = {
            x: 100,
            y: 300,
            width: 40,
            height: 20,
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.3,
            deceleration: 0.2,
            rotation: 0,
            color: this.getTeamColor(this.user.tim),
            lap: 0,
            checkpoints: [],
            finished: false,
            finishTime: null
        };

        // Create track
        this.createTrack();
        
        // Create obstacles
        this.createObstacles();
        
        // Setup controls
        this.setupControls();
    }

    getTeamColor(team) {
        const colors = {
            'Team Alpha': '#FF6B6B',
            'Team Beta': '#4ECDC4',
            'Team Gamma': '#45B7D1'
        };
        return colors[team] || '#FFFFFF';
    }

    createTrack() {
        // Simple oval track
        this.track = {
            outerBounds: [
                {x: 50, y: 50},
                {x: 750, y: 50},
                {x: 750, y: 550},
                {x: 50, y: 550}
            ],
            innerBounds: [
                {x: 200, y: 200},
                {x: 600, y: 200},
                {x: 600, y: 400},
                {x: 200, y: 400}
            ]
        };

        // Create checkpoints
        this.checkpoints = [
            {x: 400, y: 100, width: 100, height: 20, id: 0}, // Start/Finish
            {x: 700, y: 300, width: 20, height: 100, id: 1},
            {x: 400, y: 500, width: 100, height: 20, id: 2},
            {x: 100, y: 300, width: 20, height: 100, id: 3}
        ];
    }

    createObstacles() {
        // Add some random obstacles on the track
        this.obstacles = [
            {x: 300, y: 150, width: 30, height: 30},
            {x: 500, y: 450, width: 30, height: 30},
            {x: 650, y: 250, width: 30, height: 30},
            {x: 150, y: 350, width: 30, height: 30}
        ];
    }

    setupControls() {
        this.keys = {};
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            e.preventDefault();
        });
    }

    start() {
        console.log('Starting Efficiency Race game...');
        this.isRunning = true;
        this.gameState = 'playing';
        this.startTime = Date.now();
        
        // Notify server
        this.socket.emit('game-activity', {
            type: 'game_started_player',
            user: this.user,
            game: this.game
        });
    }

    end() {
        console.log('Ending Efficiency Race game...');
        this.isRunning = false;
        this.gameState = 'finished';
        
        // Calculate results
        const result = {
            user: this.user,
            lap: this.playerCar.lap,
            finished: this.playerCar.finished,
            time: this.playerCar.finishTime ? (this.playerCar.finishTime - this.startTime) / 1000 : null
        };
        
        this.emit('gameOver', result);
    }

    update() {
        if (!this.isRunning) return;

        // Handle input
        this.handleInput();
        
        // Update player car
        this.updatePlayerCar();
        
        // Check collisions
        this.checkCollisions();
        
        // Check checkpoints
        this.checkCheckpoints();
        
        // Check if finished
        this.checkFinish();
    }

    handleInput() {
        const car = this.playerCar;
        
        // Acceleration/Braking
        if (this.keys['ArrowUp'] || this.keys['w']) {
            car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
        } else if (this.keys['ArrowDown'] || this.keys['s']) {
            car.speed = Math.max(car.speed - car.deceleration, -car.maxSpeed / 2);
        } else {
            // Natural deceleration
            if (car.speed > 0) {
                car.speed = Math.max(car.speed - car.deceleration / 2, 0);
            } else if (car.speed < 0) {
                car.speed = Math.min(car.speed + car.deceleration / 2, 0);
            }
        }
        
        // Steering
        if (this.keys['ArrowLeft'] || this.keys['a']) {
            car.rotation -= 0.05;
        } else if (this.keys['ArrowRight'] || this.keys['d']) {
            car.rotation += 0.05;
        }
    }

    updatePlayerCar() {
        const car = this.playerCar;
        
        // Update position based on speed and rotation
        car.x += Math.cos(car.rotation) * car.speed;
        car.y += Math.sin(car.rotation) * car.speed;
        
        // Keep car on screen
        car.x = Math.max(car.width / 2, Math.min(this.canvas.width - car.width / 2, car.x));
        car.y = Math.max(car.height / 2, Math.min(this.canvas.height - car.height / 2, car.y));
    }

    checkCollisions() {
        const car = this.playerCar;
        
        // Check obstacle collisions
        for (const obstacle of this.obstacles) {
            if (this.isColliding(car, obstacle)) {
                // Bounce back
                car.speed *= -0.5;
                car.x -= Math.cos(car.rotation) * car.speed * 2;
                car.y -= Math.sin(car.rotation) * car.speed * 2;
            }
        }
        
        // Check track boundaries
        if (!this.isOnTrack(car)) {
            // Slow down when off track
            car.speed *= 0.95;
        }
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    isOnTrack(car) {
        // Simple check if car is within outer bounds and outside inner bounds
        const inOuter = car.x > 50 && car.x < 750 && car.y > 50 && car.y < 550;
        const inInner = car.x > 200 && car.x < 600 && car.y > 200 && car.y < 400;
        return inOuter && !inInner;
    }

    checkCheckpoints() {
        const car = this.playerCar;
        
        for (const checkpoint of this.checkpoints) {
            if (this.isColliding(car, checkpoint)) {
                if (!car.checkpoints.includes(checkpoint.id)) {
                    car.checkpoints.push(checkpoint.id);
                    
                    // Check if completed a lap
                    if (checkpoint.id === 0 && car.checkpoints.length === 4) {
                        car.lap++;
                        car.checkpoints = [];
                        
                        if (car.lap >= this.maxLaps) {
                            car.finished = true;
                            car.finishTime = Date.now();
                        }
                    }
                }
            }
        }
    }

    checkFinish() {
        if (this.playerCar.finished && !this.playerCar.finishReported) {
            this.playerCar.finishReported = true;
            this.end();
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw track
        this.drawTrack();
        
        // Draw checkpoints
        this.drawCheckpoints();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw player car
        this.drawPlayerCar();
        
        // Draw UI
        this.drawUI();
        
        // Update game state
        this.update();
        
        // Continue render loop
        requestAnimationFrame(() => this.render());
    }

    drawTrack() {
        // Draw outer track boundary
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.rect(50, 50, 700, 500);
        this.ctx.stroke();
        
        // Draw inner track boundary
        this.ctx.strokeStyle = '#444';
        this.ctx.beginPath();
        this.ctx.rect(200, 200, 400, 200);
        this.ctx.stroke();
        
        // Draw track surface
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(53, 53, 694, 494);
        this.ctx.clearRect(203, 203, 394, 194);
    }

    drawCheckpoints() {
        for (const checkpoint of this.checkpoints) {
            const passed = this.playerCar.checkpoints.includes(checkpoint.id);
            this.ctx.fillStyle = passed ? '#4CAF50' : '#FFC107';
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
            this.ctx.globalAlpha = 1.0;
            
            // Draw checkpoint number
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                checkpoint.id === 0 ? 'START/FINISH' : `CP ${checkpoint.id}`,
                checkpoint.x + checkpoint.width / 2,
                checkpoint.y + checkpoint.height / 2 + 5
            );
        }
    }

    drawObstacles() {
        this.ctx.fillStyle = '#F44336';
        for (const obstacle of this.obstacles) {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    }

    drawPlayerCar() {
        const car = this.playerCar;
        
        this.ctx.save();
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.rotation);
        
        // Draw car body
        this.ctx.fillStyle = car.color;
        this.ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
        
        // Draw car direction indicator
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillRect(car.width / 2 - 5, -3, 5, 6);
        
        this.ctx.restore();
    }

    drawUI() {
        // Draw lap counter
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Lap: ${this.playerCar.lap}/${this.maxLaps}`, 20, 30);
        
        // Draw speed
        this.ctx.fillText(`Speed: ${Math.abs(this.playerCar.speed * 10).toFixed(0)} km/h`, 20, 55);
        
        // Draw team
        this.ctx.fillText(`Team: ${this.user.tim}`, 20, 80);
        
        // Draw game state
        if (this.gameState === 'waiting') {
            this.ctx.fillStyle = '#FFC107';
            this.ctx.textAlign = 'center';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Waiting for game to start...', this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Draw finish message
        if (this.playerCar.finished) {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.textAlign = 'center';
            this.ctx.font = '32px Arial';
            this.ctx.fillText('FINISHED!', this.canvas.width / 2, this.canvas.height / 2);
            
            const time = ((this.playerCar.finishTime - this.startTime) / 1000).toFixed(2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Time: ${time}s`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }

    onGameActivity(data) {
        console.log('Game activity received:', data);
    }

    onTimeUp() {
        console.log('Time up!');
        this.end();
    }

    cleanup() {
        // Clean up event listeners and resources
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        console.log('Efficiency Race game cleaned up');
    }
}

// Export for global access
window.GameInstance = GameInstance;
