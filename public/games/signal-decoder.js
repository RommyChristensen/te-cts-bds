// The Signal Decoder - Morse Code Competition Game
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
        this.currentQuestion = null;
        this.userAnswer = '';
        this.startTime = null;
        this.endTime = null;
        this.teamNumber = null;
        this.morseQuestions = [];
        this.isFinished = false;
        this.submittedAnswer = null;
        
        this.setupCanvas();
        this.loadQuestions();
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

    async loadQuestions() {
        try {
            // Load questions from JSON file
            const response = await fetch('/data/signal-decoder-questions.json');
            const data = await response.json();
            this.morseQuestions = data.questions;
        } catch (error) {
            console.error('Error loading questions:', error);
            // Fallback to default questions
            this.morseQuestions = [
                {
                    id: 1,
                    team: 1,
                    morse: ".... . .-.. .-.. ---",
                    answer: "123",
                    hint: "Angka 1-3"
                }
            ];
        }
    }

    async init() {
        console.log('Initializing The Signal Decoder game...');
        console.log('User:', this.user);
        console.log('Game:', this.game);
        
        // Load questions from JSON
        await this.loadQuestions();
        
        // Determine team number from user data
        this.teamNumber = this.extractTeamNumber();
        
        // Get question for this team
        this.currentQuestion = this.morseQuestions.find(q => q.team === this.teamNumber);
        
        if (!this.currentQuestion) {
            this.showError('No question assigned for your team');
            return;
        }
        
        // Setup controls
        this.setupControls();
        
        // Auto-start game for immediate play
        this.start();
        
        // Start render loop
        this.render();
        
        this.emit('ready');
    }

    extractTeamNumber(teamData) {
        // Handle different field names and undefined values
        let teamName = teamData;
        
        // Check if user has tim field
        if (this.user.tim) {
            teamName = this.user.tim;
        } else if (this.user.team) {
            teamName = this.user.team;
        } else if (this.user.bds_team) {
            teamName = this.user.bds_team;
        }
        
        console.log('Extracting team number from:', teamName);
        
        if (!teamName) {
            console.log('No team name found, defaulting to Team 1');
            return 1;
        }
        
        // Extract team number from team name (Team 1, Team 2, etc.)
        const match = teamName.toString().match(/(\d+)/);
        const teamNumber = match ? parseInt(match[1]) : 1;
        
        console.log('Extracted team number:', teamNumber);
        return teamNumber;
    }

    setupControls() {
        // Handle keyboard input for answer
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isFinished) return;
            
            if (e.key >= '0' && e.key <= '9') {
                if (this.userAnswer.length < 3) {
                    this.userAnswer += e.key;
                }
            } else if (e.key === 'Backspace') {
                this.userAnswer = this.userAnswer.slice(0, -1);
            } else if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });

        // Track admin actions
        this.gameEnded = false;
        this.rewardsData = null;

        // Listen for game ended event (admin ends the game)
        this.socket.on('game-ended', (data) => {
            console.log('🏁 Game ended by admin');
            this.gameEnded = true;
            this.checkAndRedirect();
        });

        // Listen for rewards distribution event
        this.socket.on('rewards-distributed', (data) => {
            console.log('🎁 Rewards distributed by admin:', data);
            this.rewardsData = data;
            this.checkAndRedirect();
        });

        // Check if both actions completed, then redirect
        this.checkAndRedirect = () => {
            if (this.gameEnded && this.rewardsData) {
                console.log('✅ Both game ended and rewards distributed, redirecting to result page...');
                
                // Encode rewards data as URL parameter
                const encodedData = btoa(JSON.stringify(this.rewardsData));
                const resultUrl = `/game/result?results=${encodedData}`;
                console.log('🔗 Redirecting to:', resultUrl);
                
                window.location.href = resultUrl;
            }
        };
    }

    start() {
        console.log('Starting The Signal Decoder game...');
        this.isRunning = true;
        this.gameState = 'playing';
        this.startTime = Date.now();
        
        // Notify server about game progress
        this.socket.emit('game-progress', {
            gameStatus: 'playing',
            teamProgress: {
                [`Team ${this.teamNumber}`]: {
                    started: true,
                    completed: false,
                    player: this.user,
                    time: Date.now()
                }
            }
        });
        
        // Notify server
        this.socket.emit('game-activity', {
            type: 'game_started_player',
            user: this.user,
            game: this.game,
            team: this.teamNumber
        });
    }

    end() {
        console.log('Ending The Signal Decoder game...');
        this.isRunning = false;
        this.gameState = 'finished';
        
        if (!this.endTime) {
            this.endTime = Date.now();
        }
        
        // Calculate results
        const result = {
            user: this.user,
            team: this.teamNumber,
            question: this.currentQuestion.id,
            answer: this.submittedAnswer,
            correct: this.submittedAnswer === this.currentQuestion.answer,
            time: this.endTime - this.startTime,
            finished: this.isFinished
        };
        
        this.emit('gameOver', result);
    }

    submitAnswer() {
        if (this.isFinished || this.userAnswer.length !== 3) return;
        
        this.submittedAnswer = this.userAnswer;
        this.isFinished = true;
        this.endTime = Date.now();
        
        // Check if answer is correct
        const isCorrect = this.userAnswer === this.currentQuestion.answer;
        
        // Notify server about game progress
        this.socket.emit('game-progress', {
            gameStatus: isCorrect ? 'finished' : 'playing',
            teamProgress: {
                [`Team ${this.teamNumber}`]: {
                    started: true,
                    completed: isCorrect,
                    player: this.user,
                    answer: this.submittedAnswer,
                    correct: isCorrect,
                    time: this.endTime - this.startTime
                }
            }
        });
        
        // Notify server about answer submission
        this.socket.emit('game-activity', {
            type: 'answer_submitted',
            user: this.user,
            team: this.teamNumber,
            answer: this.submittedAnswer,
            correct: isCorrect,
            time: this.endTime - this.startTime
        });

        // Emit specific answer submitted event for immediate feedback
        this.socket.emit('answer-submitted', {
            user: this.user,
            team: this.teamNumber,
            teamName: `Team ${this.teamNumber}`,
            answer: this.submittedAnswer,
            correct: isCorrect,
            question: this.currentQuestion.id,
            time: this.endTime - this.startTime,
            timestamp: Date.now()
        });
        
        if (isCorrect) {
            // Correct answer - end game
            this.end();
        } else {
            // Wrong answer - allow retry after delay
            setTimeout(() => {
                this.userAnswer = '';
                this.submittedAnswer = null;
                this.isFinished = false;
                
                // Update progress to show retry
                this.socket.emit('game-progress', {
                    gameStatus: 'playing',
                    teamProgress: {
                        [`Team ${this.teamNumber}`]: {
                            started: true,
                            completed: false,
                            player: this.user,
                            retry: true
                        }
                    }
                });
            }, 2000);
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background pattern
        this.drawBackgroundPattern();
        
        // Draw game content
        if (this.gameState === 'waiting') {
            this.drawWaitingScreen();
        } else if (this.gameState === 'playing') {
            this.drawGameScreen();
        } else if (this.gameState === 'finished') {
            this.drawFinishedScreen();
        }
        
        // Continue render loop
        requestAnimationFrame(() => this.render());
    }

    drawBackgroundPattern() {
        // Draw Morse code pattern in background
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.05)';
        this.ctx.font = '12px monospace';
        
        const morseChars = ['.', '-', '/', '.-', '-.', '..', '--.', '....', '..', '.---', '-.-', '.-..', '--', '-.', '---', '.--.', '--.-', '.-.', '...', '-', '..-', '...-', '.--', '-..-', '-.--', '--..'];
        
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 15; j++) {
                const char = morseChars[Math.floor(Math.random() * morseChars.length)];
                this.ctx.fillText(char, i * 40, j * 40);
            }
        }
    }

    drawWaitingScreen() {
        // Title
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('THE SIGNAL DECODER', this.canvas.width / 2, 150);
        
        // Subtitle
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Morse Code Competition', this.canvas.width / 2, 200);
        
        // Team info
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Team ${this.teamNumber} - ${this.user.nama}`, this.canvas.width / 2, 250);
        
        // Instructions
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Decode the Morse code to reveal 3-digit number', this.canvas.width / 2, 320);
        this.ctx.fillText('Wait for the game to start...', this.canvas.width / 2, 350);
        
        // Morse code decoration
        this.drawMorseBorder();
    }

    drawGameScreen() {
        // Timer
        if (this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`TIME: ${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`, 20, 40);
        }
        
        // Title
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DECODE THIS SIGNAL', this.canvas.width / 2, 80);
        
        // Team info
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '18px Arial';
        this.ctx.fillText(`Team ${this.teamNumber}`, this.canvas.width / 2, 110);
        
        // Morse code display
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = 'bold 48px monospace';
        this.ctx.fillText(this.currentQuestion.morse, this.canvas.width / 2, 200);
        
        // Hint
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Hint: ${this.currentQuestion.hint}`, this.canvas.width / 2, 240);
        
        // Answer input
        this.drawAnswerInput();
        
        // Instructions
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Type 3 digits and press ENTER to submit', this.canvas.width / 2, 420);
        this.ctx.fillText('Backspace to delete', this.canvas.width / 2, 440);
        
        // Status
        if (this.isFinished) {
            const isCorrect = this.submittedAnswer === this.currentQuestion.answer;
            this.ctx.fillStyle = isCorrect ? '#4CAF50' : '#F44336';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(isCorrect ? 'CORRECT!' : 'WRONG! Try again...', this.canvas.width / 2, 480);
        }
        
        this.drawMorseBorder();
    }

    drawAnswerInput() {
        const boxWidth = 300;
        const boxHeight = 60;
        const boxX = (this.canvas.width - boxWidth) / 2;
        const boxY = 300;
        
        // Draw input box
        this.ctx.strokeStyle = this.isFinished ? '#666' : '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw answer digits
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 36px monospace';
        this.ctx.textAlign = 'center';
        
        for (let i = 0; i < 3; i++) {
            const digitX = boxX + (i + 0.5) * (boxWidth / 3);
            const digit = this.userAnswer[i] || '_';
            
            if (this.isFinished) {
                const correctDigit = this.currentQuestion.answer[i];
                const userDigit = this.submittedAnswer ? this.submittedAnswer[i] : '';
                
                if (userDigit === correctDigit) {
                    this.ctx.fillStyle = '#4CAF50';
                } else if (userDigit) {
                    this.ctx.fillStyle = '#F44336';
                } else {
                    this.ctx.fillStyle = '#666';
                }
                this.ctx.fillText(correctDigit, digitX, boxY + 40);
            } else {
                this.ctx.fillStyle = digit === '_' ? '#666' : '#FFF';
                this.ctx.fillText(digit, digitX, boxY + 40);
            }
        }
    }

    drawFinishedScreen() {
        const isCorrect = this.submittedAnswer === this.currentQuestion.answer;
        const time = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        // Title
        this.ctx.fillStyle = isCorrect ? '#4CAF50' : '#F44336';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(isCorrect ? 'MISSION COMPLETE!' : 'TRY AGAIN NEXT TIME', this.canvas.width / 2, 150);
        
        // Results
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Team ${this.teamNumber}`, this.canvas.width / 2, 220);
        this.ctx.fillText(`Time: ${time} seconds`, this.canvas.width / 2, 260);
        this.ctx.fillText(`Answer: ${this.currentQuestion.answer}`, this.canvas.width / 2, 300);
        
        if (isCorrect) {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Congratulations! Well done!', this.canvas.width / 2, 360);
        }
        
        // Redirect message
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Redirecting to results...', this.canvas.width / 2, 450);
        
        this.drawMorseBorder();
    }

    drawMorseBorder() {
        // Draw Morse code border decoration
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        
        // Top border
        this.ctx.beginPath();
        this.ctx.moveTo(50, 30);
        this.ctx.lineTo(150, 30);
        this.ctx.stroke();
        
        // Bottom border
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 150, this.canvas.height - 30);
        this.ctx.lineTo(this.canvas.width - 50, this.canvas.height - 30);
        this.ctx.stroke();
        
        // Side decorations
        const morsePattern = '.- .-.- .-- .- -';
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(morsePattern, 20, 50);
        this.ctx.fillText(morsePattern, this.canvas.width - 100, this.canvas.height - 20);
    }

    showError(message) {
        console.error('Game error:', message);
        this.emit('error', new Error(message));
    }

    onGameActivity(data) {
        console.log('Game activity received:', data);
        
        // Handle other teams' progress
        if (data.type === 'answer_submitted' && data.team !== this.teamNumber) {
            // Show notification about other team's progress
            this.showNotification(`Team ${data.team} submitted answer!`, 'info');
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system (could be enhanced)
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    onTimeUp() {
        console.log('Time up!');
        this.end();
    }

    cleanup() {
        // Clean up event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        console.log('The Signal Decoder game cleaned up');
    }
}

// Export for global access
window.GameInstance = GameInstance;
