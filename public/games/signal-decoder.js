// The Signal Decoder - Morse Code Competition Game
class GameInstance {
    constructor(options) {
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.socket = options.socket;
        this.user = options.user;
        this.game = options.game;
        this.gameId = options.gameId;
        this.startTime = options.startTime || null;
        console.log("startTime: " + (Date.now() - this.startTime));
        
        this.events = {};
        this.isRunning = false;
        this.gameState = 'waiting';
        
        // Game specific properties
        this.currentQuestion = null;
        this.userAnswer = '';
        this.endTime = null;
        this.teamNumber = null;
        this.morseQuestions = [];
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
        // Responsive canvas sizing
        console.log('📱 Mobile detection:', this.isMobile, 'Window width:', window.innerWidth);
        
        if (this.isMobile) {
            // Mobile dimensions
            this.canvas.width = Math.min(window.innerWidth - 20, 400);
            this.canvas.height = Math.min(window.innerHeight - 200, 400);
        } else {
            // Desktop dimensions
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
        
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.border = '2px solid #4CAF50';
        this.canvas.style.borderRadius = '8px';
        
        // Create number pad for mobile
        if (this.isMobile) {
            console.log('📱 Creating number pad for mobile');
            this.createNumberPad();
        } else {
            console.log('🖥️ Desktop mode - no keypad');
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
        console.log('🎮 createNumberPad() called');
        
        // Create number pad container with game theme
        const padContainer = document.createElement('div');
        padContainer.id = 'numberPad';
        padContainer.style.cssText = `
            background: black
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
        
        console.log('🎮 Pad container created:', padContainer);

        // Create number rows
        const rows = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['0', 'Clear', 'Enter']
        ];

        rows.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.style.cssText = `
                display: flex;
                gap: 8px;
                justify-content: center;
                align-items: center;
            `;

            row.forEach((buttonText, colIndex) => {
                const button = document.createElement('button');
                button.textContent = buttonText;
                
                // Theme-based button styling
                const isNumber = /^\d$/.test(buttonText);
                const isEnter = buttonText === 'Enter';
                const isClear = buttonText === 'Clear';
                
                button.style.cssText = `
                    flex: 1;
                    padding: ${isNumber ? '18px 12px' : '16px 8px'};
                    font-size: ${isNumber ? '20px' : '14px'};
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    border: 2px solid ${isEnter ? '#4CAF50' : isClear ? '#f44336' : '#4CAF50'};
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    background: ${isEnter ? 
                        'linear-gradient(135deg, #4CAF50, #45a049)' : 
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

                // Add inner glow effect
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

                // Enhanced hover effects
                button.addEventListener('mouseenter', () => {
                    button.style.transform = 'translateY(-2px)';
                    button.style.boxShadow = '0 5px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)';
                    button.style.borderColor = isEnter ? '#66bb6a' : isClear ? '#ef5350' : '#66bb6a';
                });

                button.addEventListener('mouseleave', () => {
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
                    button.style.borderColor = isEnter ? '#4CAF50' : isClear ? '#f44336' : '#4CAF50';
                });

                // Add click handler
                button.addEventListener('click', () => {
                    this.handleNumberPadClick(buttonText);
                    // Click animation
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        button.style.transform = 'translateY(0)';
                    }, 100);
                });

                // Enhanced touch feedback for mobile
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

        // Append keypad to canvas parent (game-content) instead of body
        console.log('📍 Before append - canvas parent:', this.canvas.parentElement);
        const canvasParent = this.canvas.parentElement;
        if (canvasParent) {
            canvasParent.appendChild(padContainer);
            console.log('✅ Keypad appended to canvas parent (game-content)');
        } else {
            // Fallback to body if canvas parent doesn't exist
            document.body.appendChild(padContainer);
            console.log('⚠️ Canvas parent not found, appended to body');
        }
        
        console.log('📍 Keypad element in DOM:', document.getElementById('numberPad') ? 'YES' : 'NO');
        console.log('📍 Keypad display style:', padContainer.style.display);
        console.log('📍 Keypad visibility:', window.getComputedStyle(padContainer).display);
    }

    handleNumberPadClick(buttonText) {
        if (buttonText === 'Enter') {
            this.submitAnswer();
        } else if (buttonText === 'Clear') {
            this.userAnswer = '';
            if (!this.isFinished) {
                this.render();
            }
        } else if (this.userAnswer.length < 3 && /^\d$/.test(buttonText)) {
            this.userAnswer += buttonText;
            if (!this.isFinished) {
                this.render();
            }
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
        this.start(this.startTime);
        
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

        // Handle window resize for responsive behavior
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.detectMobile();
            
            // Only recreate canvas if mobile status changed
            if (wasMobile !== this.isMobile) {
                this.setupCanvas();
                this.render();
            }
        });

        // Track admin actions
        this.gameEnded = false;
        this.rewardsData = null;

        // Join game room to receive game-ended and rewards-distributed events
        if (this.gameId) {
            console.log('🎮 Joining game room:', 'game-' + this.gameId);
            this.socket.emit('join-game', { gameId: this.gameId, user: this.user });
        }

        // Listen for game ended event (admin ends the game)
        this.socket.on('game-ended', (data) => {
            console.log('🏁 Game ended by admin, data:', data);
            this.gameEnded = true;
            console.log('✅ gameEnded set to true');
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
            console.log('🔄 checkAndRedirect called - gameEnded:', this.gameEnded, 'rewardsData:', this.rewardsData);
            if (this.gameEnded && this.rewardsData) {
                console.log('✅ Both game ended and rewards distributed, redirecting to result page...');
                console.log('🎮 GameId:', this.gameId);
                console.log('🎁 Rewards data:', this.rewardsData);
                
                try {
                    // Encode rewards data as URL parameter
                    const encodedData = btoa(JSON.stringify(this.rewardsData));
                    let resultUrl = `/game/result?results=${encodedData}`;
                    
                    // Add gameId to URL
                    if (this.gameId) {
                        resultUrl += `&gameId=${this.gameId}`;
                    }
                    
                    console.log('🔗 Redirecting to:', resultUrl);
                    
                    // Redirect immediately
                    window.location.href = resultUrl;
                } catch (error) {
                    console.error('❌ Error during redirect:', error);
                    // Fallback redirect
                    let fallbackUrl = '/game/result';
                    if (this.gameId) {
                        fallbackUrl += `?gameId=${this.gameId}`;
                    }
                    console.log('🔄 Using fallback URL:', fallbackUrl);
                    window.location.href = fallbackUrl;
                }
            } else {
                console.log('⏳ Waiting for both conditions: gameEnded=' + this.gameEnded + ', rewardsData=' + (this.rewardsData ? 'set' : 'null'));
            }
        };
    }

    start(persistentStartTime = null) {
        console.log('Starting The Signal Decoder game...');
        this.isRunning = true;
        this.gameState = 'playing';
        // Use persistent start time from server if provided, otherwise use current time
        this.startTime = persistentStartTime || Date.now();
        console.log('⏱️ Game start time:', this.startTime, persistentStartTime ? '(from server)' : '(local)');
        
        const elapsedTime = Date.now() - this.startTime;
        console.log("elapsedTime: " + elapsedTime)
        // Notify server about game progress
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
        
        // Update progress every 500ms to show real-time elapsed time
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
        
        // Notify server
        this.socket.emit('game-activity', {
            gameId: this.gameId,
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
        
        // Clear progress interval
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
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
        
        // Notify server about answer submission
        this.socket.emit('game-activity', {
            gameId: this.gameId,
            type: 'answer_submitted',
            user: this.user,
            team: this.teamNumber,
            answer: this.submittedAnswer,
            correct: isCorrect,
            time: this.endTime - this.startTime
        });

        // Emit specific answer submitted event for immediate feedback
        this.socket.emit('answer-submitted', {
            gameId: this.gameId,
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
        // Responsive font sizes
        const titleSize = this.isMobile ? 24 : 36;
        const morseSize = this.isMobile ? 14 : 20; // Smaller morse code
        
        // Title with top margin
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = `bold ${titleSize}px Arial`;
        this.ctx.textAlign = 'center';
        const titleY = this.isMobile ? 80 : 100; // Added top margin
        this.ctx.fillText('DECODE THIS SIGNAL', this.canvas.width / 2, titleY);
        
        // Team info
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `${this.isMobile ? 16 : 18}px Arial`;
        const teamY = this.isMobile ? 105 : 130; // Adjusted for title margin
        this.ctx.fillText(`Team ${this.teamNumber}`, this.canvas.width / 2, teamY);
        
        // Morse code display - adjust for mobile
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = `bold ${morseSize}px monospace`;
        
        // Handle long morse code on mobile (removed hint, adjusted spacing)
        let morseText = this.currentQuestion.morse;
        if (this.isMobile && morseText.length > 20) {
            // Break long morse code into multiple lines
            const words = morseText.split(' ');
            const midPoint = Math.ceil(words.length / 2);
            const line1 = words.slice(0, midPoint).join(' ');
            const line2 = words.slice(midPoint).join(' ');
            
            const morseY = this.isMobile ? 160 : 220; // Adjusted for no hint
            this.ctx.fillText(line1, this.canvas.width / 2, morseY);
            this.ctx.fillText(line2, this.canvas.width / 2, morseY + morseSize + 10);
        } else {
            const morseY = this.isMobile ? 160 : 220; // Adjusted for no hint
            this.ctx.fillText(morseText, this.canvas.width / 2, morseY);
        }
        
        // Answer input
        this.drawAnswerInput();
        
        // Instructions - different for mobile vs desktop (added top margin)
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `${this.isMobile ? 12 : 14}px Arial`;
        const instructionY = this.isMobile ? 300 : 440; // Added top margin
        
        if (this.isMobile) {
            this.ctx.fillText('Use number pad below to enter answer', this.canvas.width / 2, instructionY);
            this.ctx.fillText('Tap ENTER to submit, CLEAR to reset', this.canvas.width / 2, instructionY + 20);
        } else {
            this.ctx.fillText('Type 3 digits and press ENTER to submit', this.canvas.width / 2, instructionY);
            this.ctx.fillText('Backspace to delete', this.canvas.width / 2, instructionY + 20);
        }
        
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
        // Responsive sizing
        const boxWidth = this.isMobile ? 240 : 300;
        const boxHeight = this.isMobile ? 50 : 60;
        const boxX = (this.canvas.width - boxWidth) / 2;
        const boxY = this.isMobile ? 230 : 300;
        const digitSize = this.isMobile ? 28 : 36;
        
        // Draw input box
        this.ctx.strokeStyle = this.isFinished ? '#666' : '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw answer digits
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `bold ${digitSize}px monospace`;
        this.ctx.textAlign = 'center';
        
        for (let i = 0; i < 3; i++) {
            const digitX = boxX + (i + 0.5) * (boxWidth / 3);
            const digit = this.userAnswer[i] || '_';
            
            if (this.isFinished) {
                const correctDigit = this.currentQuestion.answer[i];
                const userDigit = this.submittedAnswer ? this.submittedAnswer[i] : '';
                
                if (userDigit === correctDigit) {
                    this.ctx.fillStyle = '#666';
                } else if (userDigit) {
                    this.ctx.fillStyle = '#666';
                } else {
                    this.ctx.fillStyle = '#666';
                }
                this.ctx.fillText("_", digitX, boxY + 40);
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
        
        // Remove number pad if exists
        const numberPad = document.getElementById('numberPad');
        if (numberPad) {
            numberPad.remove();
        }
        
        // Reset body padding
        document.body.style.paddingBottom = '0';
        
        console.log('The Signal Decoder game cleaned up');
    }
}

// Export for global access
window.GameInstance = GameInstance;
