// Test Game - Simple Click Game
class GameInstance {
    constructor(options) {
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.socket = options.socket;
        this.user = options.user;
        this.game = options.game;
        
        this.events = {};
        this.isRunning = false;
        this.gameState = 'waiting';
        
        // Game specific properties
        this.targets = [];
        this.score = 0;
        this.timeRemaining = 30;
        this.maxTargets = 5;
        this.targetSpawnTimer = 0;
        this.targetSpawnInterval = 1000; // 1 second
        
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
        console.log('Initializing Test Game...');
        console.log('User:', this.user);
        console.log('Game:', this.game);
        
        // Initialize game
        this.score = 0;
        this.targets = [];
        this.targetSpawnTimer = 0;
        
        // Setup controls
        this.setupControls();
        
        // Start render loop
        this.render();
        
        this.emit('ready');
    }

    setupControls() {
        this.canvas.addEventListener('click', (e) => {
            if (!this.isRunning) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            this.handleClick(x, y);
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.isRunning) return;
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            
            this.handleClick(x, y);
        });
    }

    handleClick(x, y) {
        // Check if any target was hit
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = Math.sqrt(Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2));
            
            if (distance <= target.radius) {
                // Hit!
                this.score += target.points;
                this.targets.splice(i, 1);
                
                // Create particle effect
                this.createHitEffect(target.x, target.y, target.color);
                break;
            }
        }
    }

    createHitEffect(x, y, color) {
        // Simple visual feedback
        const particles = [];
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: color
            });
        }
        
        // Animate particles (simplified)
        const animateParticles = () => {
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                p.vx *= 0.95;
                p.vy *= 0.95;
            });
            
            if (particles.some(p => p.life > 0)) {
                requestAnimationFrame(animateParticles);
            }
        };
        animateParticles();
    }

    start() {
        console.log('Starting Test Game...');
        this.isRunning = true;
        this.gameState = 'playing';
        this.score = 0;
        this.timeRemaining = this.game.duration * 60; // Convert minutes to seconds
        
        // Notify server
        this.socket.emit('game-activity', {
            type: 'game_started_player',
            user: this.user,
            game: this.game
        });
    }

    end() {
        console.log('Ending Test Game...');
        this.isRunning = false;
        this.gameState = 'finished';
        
        // Calculate results
        const result = {
            user: this.user,
            score: this.score,
            targetsHit: this.score / 10, // Assuming 10 points per target
            accuracy: this.calculateAccuracy()
        };
        
        this.emit('gameOver', result);
    }

    calculateAccuracy() {
        // This would track total clicks vs hits in a real implementation
        return Math.min(100, this.score); // Simple calculation for demo
    }

    update() {
        if (!this.isRunning) return;

        // Update timer
        this.timeRemaining -= 1/60; // Assuming 60 FPS
        
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.end();
            return;
        }

        // Spawn targets
        this.targetSpawnTimer += 16.67; // Approximate frame time
        if (this.targetSpawnTimer >= this.targetSpawnInterval && this.targets.length < this.maxTargets) {
            this.spawnTarget();
            this.targetSpawnTimer = 0;
        }

        // Update targets
        this.targets.forEach(target => {
            target.lifetime--;
            if (target.lifetime <= 0) {
                const index = this.targets.indexOf(target);
                this.targets.splice(index, 1);
            }
        });
    }

    spawnTarget() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
        const target = {
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: Math.random() * (this.canvas.height - 100) + 50,
            radius: Math.random() * 20 + 20,
            color: colors[Math.floor(Math.random() * colors.length)],
            points: Math.floor((50 - (Math.random() * 20 + 20)) / 10) * 10, // 10-30 points
            lifetime: 180, // 3 seconds at 60 FPS
            pulsePhase: 0
        };
        
        this.targets.push(target);
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid background
        this.drawGrid();
        
        // Draw targets
        this.drawTargets();
        
        // Draw UI
        this.drawUI();
        
        // Update game state
        this.update();
        
        // Continue render loop
        requestAnimationFrame(() => this.render());
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawTargets() {
        this.targets.forEach(target => {
            // Pulsing effect
            target.pulsePhase += 0.1;
            const pulse = Math.sin(target.pulsePhase) * 0.1 + 1;
            
            // Draw target
            this.ctx.fillStyle = target.color;
            this.ctx.globalAlpha = 0.8;
            this.ctx.beginPath();
            this.ctx.arc(target.x, target.y, target.radius * pulse, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw inner circle
            this.ctx.fillStyle = '#FFF';
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(target.x, target.y, target.radius * pulse * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw points value
            this.ctx.fillStyle = '#FFF';
            this.ctx.globalAlpha = 1;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(target.points, target.x, target.y + 5);
            
            // Draw lifetime bar
            const barWidth = 40;
            const barHeight = 4;
            const lifePercent = target.lifetime / 180;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(target.x - barWidth/2, target.y - target.radius - 10, barWidth, barHeight);
            
            this.ctx.fillStyle = lifePercent > 0.3 ? '#4CAF50' : '#F44336';
            this.ctx.fillRect(target.x - barWidth/2, target.y - target.radius - 10, barWidth * lifePercent, barHeight);
        });
        
        this.ctx.globalAlpha = 1;
    }

    drawUI() {
        // Draw score
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        
        // Draw timer
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.ctx.fillText(`Time: ${timeText}`, 20, 70);
        
        // Draw team
        this.ctx.fillText(`Team: ${this.user.tim}`, 20, 100);
        
        // Draw targets remaining
        this.ctx.fillText(`Targets: ${this.targets.length}/${this.maxTargets}`, 20, 130);
        
        // Draw game state
        if (this.gameState === 'waiting') {
            this.ctx.fillStyle = '#FFC107';
            this.ctx.textAlign = 'center';
            this.ctx.font = '32px Arial';
            this.ctx.fillText('Click the targets!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Wait for the game to start...', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
        
        // Draw finish message
        if (this.gameState === 'finished') {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.textAlign = 'center';
            this.ctx.font = '48px Arial';
            this.ctx.fillText('GAME OVER!', this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            this.ctx.font = '32px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Redirecting to results...', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        // Draw instructions
        if (this.isRunning) {
            this.ctx.fillStyle = '#c0c0c0';
            this.ctx.textAlign = 'center';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Click or tap the targets to score points!', this.canvas.width / 2, this.canvas.height - 20);
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
        // Clean up event listeners
        this.canvas.removeEventListener('click', this.handleClick);
        this.canvas.removeEventListener('touchstart', this.handleClick);
        console.log('Test game cleaned up');
    }
}

// Export for global access
window.GameInstance = GameInstance;
