// The Sequence Master - Pattern Recognition Game
class GameInstance {
    constructor(options) {
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.socket = options.socket;
        this.user = options.user;
        this.game = options.game;
        this.gameId = options.gameId;
        this.startTime = options.startTime || null;
        
        this.events = {};
        this.isRunning = false;
        this.gameState = 'waiting';
        
        // Game specific properties
        this.currentQuestion = null;
        this.userAnswer = '';
        this.endTime = null;
        this.teamNumber = null;
        this.sequenceMasterQuestions = [];
        this.isFinished = false;
        this.submittedAnswer = null;
        
        // Mobile detection and settings
        this.isMobile = this.detectMobile();
        this.showNumberPad = this.isMobile;
        
        this.setupCanvas();
        this.loadQuestions();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    setupCanvas() {
        if (this.isMobile) {
            this.canvas.width = Math.min(window.innerWidth - 20, 400);
            this.canvas.height = Math.min(window.innerHeight - 200, 550);
        } else {
            this.canvas.width = 800;
            this.canvas.height = 750;
        }
        
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.border = '2px solid #FF9800';
        this.canvas.style.borderRadius = '8px';
        
        if (this.isMobile) {
            this.createNumberPad();
        }
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

    createNumberPad() {
        const padContainer = document.createElement('div');
        padContainer.id = 'numberPad';
        padContainer.style.cssText = `
            background: black;
            padding: 15px;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.6);
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: auto;
            margin-top: 10px;
            width: 100%;
            box-sizing: border-box;
        `;

        const rows = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['0', 'Clear', 'Enter']
        ];

        rows.forEach((row) => {
            const rowDiv = document.createElement('div');
            rowDiv.style.cssText = `
                display: flex;
                gap: 8px;
                justify-content: center;
                align-items: center;
            `;

            row.forEach((buttonText) => {
                const button = document.createElement('button');
                button.textContent = buttonText;
                
                const isNumber = /^\d$/.test(buttonText);
                const isEnter = buttonText === 'Enter';
                const isClear = buttonText === 'Clear';
                
                button.style.cssText = `
                    flex: 1;
                    padding: ${isNumber ? '18px 12px' : '16px 8px'};
                    font-size: ${isNumber ? '20px' : '14px'};
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    border: 2px solid ${isEnter ? '#FF9800' : isClear ? '#f44336' : '#FF9800'};
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    background: ${isEnter ? 
                        'linear-gradient(135deg, #FF9800, #F57C00)' : 
                        isClear ? 
                        'linear-gradient(135deg, #f44336, #da190b)' :
                        'linear-gradient(135deg, #263238, #37474f)'
                    };
                    color: white;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    box-shadow: 0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
                    min-height: 50px;
                    position: relative;
                    overflow: hidden;
                `;

                const innerGlow = document.createElement('div');
                innerGlow.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
                    pointer-events: none;
                `;
                button.appendChild(innerGlow);

                button.addEventListener('mouseenter', () => {
                    button.style.transform = 'translateY(-2px)';
                    button.style.boxShadow = '0 5px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)';
                    button.style.borderColor = isEnter ? '#FFB74D' : isClear ? '#ef5350' : '#FFB74D';
                });

                button.addEventListener('mouseleave', () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                    button.style.borderColor = isEnter ? '#FF9800' : isClear ? '#f44336' : '#FF9800';
                });

                button.addEventListener('click', () => {
                    this.handleNumberPadClick(buttonText);
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        button.style.transform = 'translateY(0)';
                    }, 100);
                });

                button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    button.style.transform = 'scale(0.92)';
                    button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)';
                });

                button.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    button.style.transform = 'scale(0.95)';
                    button.style.boxShadow = '0 5px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)';
                    this.handleNumberPadClick(buttonText);
                    
                    setTimeout(() => {
                        button.style.transform = 'translateY(0)';
                        button.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                    }, 150);
                });

                rowDiv.appendChild(button);
            });

            padContainer.appendChild(rowDiv);
        });

        const canvasParent = this.canvas.parentElement;
        if (canvasParent) {
            canvasParent.appendChild(padContainer);
        } else {
            document.body.appendChild(padContainer);
        }
    }

    handleNumberPadClick(buttonText) {
        if (buttonText === 'Enter') {
            this.submitAnswer();
        } else if (buttonText === 'Clear') {
            this.userAnswer = '';
            if (!this.isFinished) {
                this.render();
            }
        } else if (/^\d$/.test(buttonText)) {
            this.userAnswer += buttonText;
            if (!this.isFinished) {
                this.render();
            }
        }
    }

    async loadQuestions() {
        try {
            const response = await fetch('/data/sequence-master-questions.json');
            const data = await response.json();
            this.sequenceMasterQuestions = data;
        } catch (error) {
            console.error('Error loading questions:', error);
            this.sequenceMasterQuestions = [];
        }
    }

    async init() {
        console.log('Initializing The Sequence Master game...');
        console.log('User:', this.user);
        console.log('Game:', this.game);
        
        await this.loadQuestions();
        
        this.teamNumber = this.extractTeamNumber();
        
        this.currentQuestion = this.sequenceMasterQuestions.find(q => {
            const qTeam = q.team.toLowerCase().trim();
            const userTeam = this.user.tim ? this.user.tim.toLowerCase().trim() : '';
            return qTeam === userTeam;
        });
        
        if (!this.currentQuestion) {
            this.showError('No question assigned for your team');
            return;
        }
        
        this.setupControls();
        this.start(this.startTime);
        this.render();
        
        this.emit('ready');
    }

    extractTeamNumber(teamData) {
        let teamName = teamData;
        
        if (this.user.tim) {
            teamName = this.user.tim;
        } else if (this.user.team) {
            teamName = this.user.team;
        } else if (this.user.bds_team) {
            teamName = this.user.bds_team;
        }
        
        console.log('Extracting team from:', teamName);
        
        if (!teamName) {
            console.log('No team name found, defaulting to Team 1');
            return 1;
        }
        
        const match = teamName.toString().match(/(\d+)/);
        const teamNumber = match ? parseInt(match[1]) : 1;
        
        console.log('Extracted team number:', teamNumber);
        return teamNumber;
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isFinished) return;
            
            if (e.key >= '0' && e.key <= '9') {
                this.userAnswer += e.key;
            } else if (e.key === 'Backspace') {
                this.userAnswer = this.userAnswer.slice(0, -1);
            } else if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });

        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.detectMobile();
            
            if (wasMobile !== this.isMobile) {
                this.setupCanvas();
                this.render();
            }
        });

        this.gameEnded = false;
        this.rewardsData = null;

        if (this.gameId) {
            console.log('🎮 Joining game room:', 'game-' + this.gameId);
            this.socket.emit('join-game', { gameId: this.gameId, user: this.user });
        }

        this.socket.on('game-ended', (data) => {
            console.log('🏁 Game ended by admin, data:', data);
            this.gameEnded = true;
            this.checkAndRedirect();
        });

        this.socket.on('rewards-distributed', (data) => {
            console.log('🎁 Rewards distributed by admin:', data);
            this.rewardsData = data;
            this.checkAndRedirect();
        });

        this.checkAndRedirect = () => {
            console.log('🔄 checkAndRedirect called - gameEnded:', this.gameEnded, 'rewardsData:', this.rewardsData);
            if (this.gameEnded && this.rewardsData) {
                console.log('✅ Both game ended and rewards distributed, redirecting to result page...');
                
                try {
                    const encodedData = btoa(JSON.stringify(this.rewardsData));
                    let resultUrl = `/game/result?results=${encodedData}`;
                    
                    if (this.gameId) {
                        resultUrl += `&gameId=${this.gameId}`;
                    }
                    
                    console.log('🔗 Redirecting to:', resultUrl);
                    window.location.href = resultUrl;
                } catch (error) {
                    console.error('❌ Error during redirect:', error);
                    let fallbackUrl = '/game/result';
                    if (this.gameId) {
                        fallbackUrl += `?gameId=${this.gameId}`;
                    }
                    window.location.href = fallbackUrl;
                }
            }
        };
    }

    start(persistentStartTime = null) {
        console.log('Starting The Sequence Master game...');
        this.isRunning = true;
        this.gameState = 'playing';
        this.startTime = persistentStartTime || Date.now();
        console.log('⏱️ Game start time:', this.startTime, persistentStartTime ? '(from server)' : '(local)');
        
        const elapsedTime = Date.now() - this.startTime;
        
        this.socket.emit('game-progress', {
            gameId: this.gameId,
            gameStatus: 'playing',
            teamProgress: {
                [`Team ${this.teamNumber}`]: {
                    started: true,
                    completed: false,
                    player: this.user,
                    time: elapsedTime
                }
            }
        });
        
        this.progressInterval = setInterval(() => {
            if (this.isRunning && !this.isFinished) {
                const elapsedTime = Date.now() - this.startTime;
                this.socket.emit('game-progress', {
                    gameId: this.gameId,
                    gameStatus: 'playing',
                    teamProgress: {
                        [`Team ${this.teamNumber}`]: {
                            started: true,
                            completed: false,
                            player: this.user,
                            time: elapsedTime
                        }
                    }
                });
            }
        }, 500);
        
        this.socket.emit('game-activity', {
            gameId: this.gameId,
            type: 'game_started_player',
            user: this.user,
            game: this.game,
            team: this.teamNumber
        });
    }

    end() {
        console.log('Ending The Sequence Master game...');
        this.isRunning = false;
        this.gameState = 'finished';
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        if (!this.endTime) {
            this.endTime = Date.now();
        }
        
        const result = {
            user: this.user,
            team: this.teamNumber,
            answer: this.submittedAnswer,
            correct: parseInt(this.submittedAnswer) === this.currentQuestion.answer,
            time: this.endTime - this.startTime,
            finished: this.isFinished
        };
        
        this.emit('gameOver', result);
    }

    submitAnswer() {
        if (this.isFinished || this.userAnswer.length === 0) return;
        
        this.submittedAnswer = this.userAnswer;
        this.isFinished = true;
        this.endTime = Date.now();
        
        const isCorrect = parseInt(this.userAnswer) === this.currentQuestion.answer;
        
        this.socket.emit('game-progress', {
            gameId: this.gameId,
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
        
        this.socket.emit('game-activity', {
            gameId: this.gameId,
            type: 'answer_submitted',
            user: this.user,
            team: this.teamNumber,
            answer: this.submittedAnswer,
            correct: isCorrect,
            time: this.endTime - this.startTime
        });

        this.socket.emit('answer-submitted', {
            gameId: this.gameId,
            user: this.user,
            team: this.teamNumber,
            teamName: `Team ${this.teamNumber}`,
            answer: this.submittedAnswer,
            correct: isCorrect,
            time: this.endTime - this.startTime,
            timestamp: Date.now()
        });
        
        if (isCorrect) {
            this.end();
        } else {
            setTimeout(() => {
                this.userAnswer = '';
                this.submittedAnswer = null;
                this.isFinished = false;
                
                this.socket.emit('game-progress', {
                    gameId: this.gameId,
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
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawBackgroundPattern();
        
        if (this.gameState === 'waiting') {
            this.drawWaitingScreen();
        } else if (this.gameState === 'playing') {
            this.drawGameScreen();
        } else if (this.gameState === 'finished') {
            this.drawFinishedScreen();
        }
        
        requestAnimationFrame(() => this.render());
    }

    drawBackgroundPattern() {
        this.ctx.fillStyle = 'rgba(255, 152, 0, 0.05)';
        this.ctx.font = '12px monospace';
        
        const chars = ['📊', '📈', '🔢', '█', '▓', '░', '◆', '◇', '■'];
        
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 15; j++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                this.ctx.fillText(char, i * 40, j * 40);
            }
        }
    }

    drawWaitingScreen() {
        this.ctx.fillStyle = '#FF9800';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('THE SEQUENCE MASTER', this.canvas.width / 2, 150);
        
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Pattern Recognition Challenge', this.canvas.width / 2, 200);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Team ${this.teamNumber} - ${this.user.nama}`, this.canvas.width / 2, 250);
        
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Find the pattern and predict the next number', this.canvas.width / 2, 320);
        this.ctx.fillText('Wait for the game to start...', this.canvas.width / 2, 350);
        
        this.drawSequenceBorder();
    }

    drawGameScreen() {
        const titleSize = this.isMobile ? 24 : 36;
        
        this.ctx.fillStyle = '#FF9800';
        this.ctx.font = `bold ${titleSize}px Arial`;
        this.ctx.textAlign = 'center';
        const titleY = this.isMobile ? 40 : 60;
        this.ctx.fillText('FIND THE PATTERN', this.canvas.width / 2, titleY);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `${this.isMobile ? 14 : 16}px Arial`;
        const teamY = this.isMobile ? 65 : 90;
        this.ctx.fillText(`Team ${this.teamNumber}`, this.canvas.width / 2, teamY);
        
        // Draw sequence boxes
        this.drawSequenceBoxes();
        
        // Draw answer input
        this.drawAnswerInput();
        
        // Instructions
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `${this.isMobile ? 12 : 14}px Arial`;
        this.ctx.textAlign = 'center';
        const instructionY = this.isMobile ? this.canvas.height - 80 : this.canvas.height - 60;
        
        if (this.isMobile) {
            this.ctx.fillText('Use number pad below to enter answer', this.canvas.width / 2, instructionY);
            this.ctx.fillText('Tap ENTER to submit, CLEAR to reset', this.canvas.width / 2, instructionY + 20);
        } else {
            this.ctx.fillText('Type the next number and press ENTER to submit', this.canvas.width / 2, instructionY);
            this.ctx.fillText('Backspace to delete', this.canvas.width / 2, instructionY + 20);
        }
        
        // Status
        if (this.isFinished) {
            const isCorrect = parseInt(this.submittedAnswer) === this.currentQuestion.answer;
            this.ctx.fillStyle = isCorrect ? '#4CAF50' : '#F44336';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(isCorrect ? 'CORRECT!' : 'WRONG! Try again...', this.canvas.width / 2, this.canvas.height - 20);
        }
        
        this.drawSequenceBorder();
    }

    drawSequenceBoxes() {
        const boxSize = this.isMobile ? 40 : 50;
        const gap = this.isMobile ? 8 : 12;
        const totalWidth = 5 * boxSize + 4 * gap;
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = this.isMobile ? 120 : 160;
        
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = `${this.isMobile ? 10 : 12}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Sequence:', startX - 40, startY + boxSize / 2 + 5);
        
        if (this.currentQuestion && this.currentQuestion.sequence) {
            this.currentQuestion.sequence.forEach((num, index) => {
                const x = startX + index * (boxSize + gap);
                const y = startY;
                
                // Draw box
                this.ctx.strokeStyle = '#FF9800';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, boxSize, boxSize);
                
                // Draw number
                this.ctx.fillStyle = '#FFF';
                this.ctx.font = `bold ${this.isMobile ? 14 : 18}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(num, x + boxSize / 2, y + boxSize / 2 + 6);
            });
            
            // Draw question mark for 6th number
            const x = startX + 5 * (boxSize + gap);
            const y = startY;
            this.ctx.strokeStyle = '#FFC107';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, boxSize, boxSize);
            this.ctx.fillStyle = '#FFC107';
            this.ctx.font = `bold ${this.isMobile ? 18 : 24}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('?', x + boxSize / 2, y + boxSize / 2 + 8);
        }
    }

    drawAnswerInput() {
        const boxWidth = this.isMobile ? 200 : 250;
        const boxHeight = this.isMobile ? 50 : 60;
        const boxX = (this.canvas.width - boxWidth) / 2;
        const boxY = this.isMobile ? this.canvas.height - 240 : this.canvas.height - 220;
        
        this.ctx.strokeStyle = this.isFinished ? '#666' : '#FF9800';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `bold ${this.isMobile ? 24 : 32}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.userAnswer || '_', boxX + boxWidth / 2, boxY + boxHeight / 2 + 10);
    }

    drawFinishedScreen() {
        const isCorrect = parseInt(this.submittedAnswer) === this.currentQuestion.answer;
        const time = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        this.ctx.fillStyle = isCorrect ? '#4CAF50' : '#F44336';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(isCorrect ? 'PATTERN SOLVED!' : 'TRY AGAIN NEXT TIME', this.canvas.width / 2, 150);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Team ${this.teamNumber}`, this.canvas.width / 2, 220);
        this.ctx.fillText(`Time: ${time} seconds`, this.canvas.width / 2, 260);
        
        if (isCorrect) {
            this.ctx.fillText(`Answer: ${this.currentQuestion.answer}`, this.canvas.width / 2, 300);
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Congratulations! Well done!', this.canvas.width / 2, 360);
        }
        
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Redirecting to results...', this.canvas.width / 2, 450);
        
        this.drawSequenceBorder();
    }

    drawSequenceBorder() {
        this.ctx.strokeStyle = '#FF9800';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(50, 30);
        this.ctx.lineTo(150, 30);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 150, this.canvas.height - 30);
        this.ctx.lineTo(this.canvas.width - 50, this.canvas.height - 30);
        this.ctx.stroke();
        
        const sequencePattern = '📊 📈 🔢 📊 📈';
        this.ctx.fillStyle = '#FF9800';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(sequencePattern, 20, 50);
        this.ctx.fillText(sequencePattern, this.canvas.width - 100, this.canvas.height - 20);
    }

    showError(message) {
        console.error('Game error:', message);
        this.emit('error', new Error(message));
    }

    onGameActivity(data) {
        console.log('Game activity received:', data);
        
        if (data.type === 'answer_submitted' && data.team !== this.teamNumber) {
            this.showNotification(`Team ${data.team} submitted answer!`, 'info');
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    onTimeUp() {
        console.log('Time up!');
        this.end();
    }

    cleanup() {
        document.removeEventListener('keydown', this.handleKeyDown);
        
        const numberPad = document.getElementById('numberPad');
        if (numberPad) {
            numberPad.remove();
        }
        
        document.body.style.paddingBottom = '0';
        
        console.log('The Sequence Master game cleaned up');
    }
}

window.GameInstance = GameInstance;
