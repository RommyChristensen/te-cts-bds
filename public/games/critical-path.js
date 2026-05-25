// The Critical Path - Project Management Game
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
        this.teamNumber = null;
        this.isFinished = false;
        this.submittedAnswer = null;
        this.endTime = null;
        
        // Grid properties
        this.gridRows = 6;
        this.gridCols = 40;
        this.cellSize = 0;
        this.gridStartX = 0;
        this.gridStartY = 0;
        this.gridWidth = 0;
        this.gridHeight = 0;
        
        // Task placement tracking
        this.taskPlacements = {}; // { taskCode: { row, col, duration } }
        this.selectedTask = null; // Currently selected task for placement
        this.taskScreenPositions = {}; // Cache for task screen positions
        this.lastTouchTime = 0; // Track last touch to suppress synthetic mouse events
        
        // Mobile detection
        this.isMobile = this.detectMobile();
        
        this.setupCanvas();
        this.loadQuestions();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    setupCanvas() {
        // Fixed cell size (2x previous) and reduced rows - canvas width derived from cellSize × cols
        this.cellSize = this.isMobile ? 40 : 48;
        const padding = this.isMobile ? 10 : 20;
        const canvasWidth = this.cellSize * this.gridCols + padding * 2;
        
        if (this.isMobile) {
            this.canvas.width = canvasWidth; // ~1620px
            this.canvas.height = 1100;
        } else {
            this.canvas.width = canvasWidth; // ~1960px
            this.canvas.height = 700;
        }
        
        this.canvas.style.border = '2px solid #2196F3';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.maxWidth = 'none';
        this.canvas.style.display = 'block';
        
        if (this.isMobile) {
            this.canvas.style.height = 'auto';
        } else {
            this.canvas.style.maxHeight = '100%';
        }
        
        // Enable horizontal scroll on parent (both mobile & desktop, since canvas is wide)
        const parent = this.canvas.parentElement;
        if (parent) {
            parent.style.overflowX = 'auto';
            parent.style.alignItems = 'flex-start';
            parent.style.justifyContent = 'flex-start';
            parent.style.width = '100%';
            parent.style.padding = '10px';
        }
        
        this.calculateGridDimensions();
    }

    calculateGridDimensions() {
        const padding = this.isMobile ? 10 : 20;
        const titleHeight = this.isMobile ? 30 : 35;
        const spacing = 10;
        
        // cellSize already set in setupCanvas
        this.gridWidth = this.cellSize * this.gridCols;
        this.gridHeight = this.cellSize * this.gridRows;
        this.gridStartX = (this.canvas.width - this.gridWidth) / 2;
        this.gridStartY = padding + titleHeight + spacing;
        
        console.log('📐 Grid Dimensions:');
        console.log('  Canvas:', this.canvas.width, 'x', this.canvas.height, '| Mobile:', this.isMobile);
        console.log('  Cell size:', this.cellSize, '| Grid:', this.gridWidth, 'x', this.gridHeight, '(' + this.gridRows + ' rows × ' + this.gridCols + ' cols)');
        console.log('  Grid at:', this.gridStartX, ',', this.gridStartY);
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
            const response = await fetch('/data/critical-path-questions.json');
            const data = await response.json();
            this.questions = data.questions;
        } catch (error) {
            console.error('Error loading questions:', error);
            this.questions = [];
        }
    }

    async init() {
        console.log('Initializing The Critical Path game...');
        
        await this.loadQuestions();
        
        this.teamNumber = this.extractTeamNumber();
        this.currentQuestion = this.questions.find(q => q.team === this.teamNumber);
        
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
        
        if (!teamName) {
            return 1;
        }
        
        const match = teamName.toString().match(/(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }

    setupControls() {
        // Mouse events for drag-drop on canvas
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // Mouse move and up on document to track drag outside canvas
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Initialize redirect tracking
        this.gameEnded = false;
        this.rewardsData = null;
        
        // Game room events
        if (this.gameId) {
            this.socket.emit('join-game', { gameId: this.gameId, user: this.user });
        }
        
        this.socket.on('game-ended', (data) => {
            this.gameEnded = true;
            this.checkAndRedirect();
        });
        
        this.socket.on('rewards-distributed', (data) => {
            this.rewardsData = data;
            this.checkAndRedirect();
        });
    }
    
    checkAndRedirect() {
        if (this.gameEnded && this.rewardsData) {
            try {
                const encodedData = btoa(JSON.stringify(this.rewardsData));
                let resultUrl = `/game/result?results=${encodedData}`;
                if (this.gameId) {
                    resultUrl += `&gameId=${this.gameId}`;
                }
                window.location.href = resultUrl;
            } catch (error) {
                console.error('Error during redirect:', error);
                let fallbackUrl = '/game/result';
                if (this.gameId) {
                    fallbackUrl += `?gameId=${this.gameId}`;
                }
                window.location.href = fallbackUrl;
            }
        }
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleMouseDown(e) {
        if (this.gameState !== 'playing') return;
        
        // Ignore synthetic mouse events that fire ~300ms after touch
        if (Date.now() - this.lastTouchTime < 500) {
            return;
        }
        
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const x = coords.x;
        const y = coords.y;
        
        // Check buttons first
        if (this.clearButtonRect && 
            x >= this.clearButtonRect.x && x <= this.clearButtonRect.x + this.clearButtonRect.width &&
            y >= this.clearButtonRect.y && y <= this.clearButtonRect.y + this.clearButtonRect.height) {
            console.log('✅ CLEAR button clicked');
            this.clearAnswer();
            return;
        }
        
        if (this.submitButtonRect &&
            x >= this.submitButtonRect.x && x <= this.submitButtonRect.x + this.submitButtonRect.width &&
            y >= this.submitButtonRect.y && y <= this.submitButtonRect.y + this.submitButtonRect.height) {
            console.log('✅ SUBMIT button clicked');
            this.submitAnswer();
            return;
        }
        
        // Check if clicking on a task in available area
        const clickedTask = this.getTaskAtPosition(x, y);
        if (clickedTask && !clickedTask.isPlaced) {
            // Select/deselect task
            if (this.selectedTask && this.selectedTask.code === clickedTask.code) {
                console.log('🔵 Task deselected:', clickedTask.code);
                this.selectedTask = null;
            } else {
                console.log('🎯 Task selected:', clickedTask.code);
                this.selectedTask = clickedTask;
            }
            return;
        }
        
        // Check if clicking on grid to place selected task
        const gridX = this.gridStartX;
        const gridY = this.gridStartY;
        
        if (this.selectedTask && 
            x >= gridX && x <= gridX + this.gridWidth &&
            y >= gridY && y <= gridY + this.gridHeight) {
            // Place selected task on grid
            const row = Math.floor((y - gridY) / this.cellSize);
            const col = Math.floor((x - gridX) / this.cellSize);
            
            console.log('📍 Attempting to place task at row:', row, 'col:', col);
            
            if (this.isValidPlacement(this.selectedTask.code, row, col, this.selectedTask.duration)) {
                this.taskPlacements[this.selectedTask.code] = { row, col, duration: this.selectedTask.duration };
                console.log('✅ Task placed successfully');
                this.selectedTask = null;
            } else {
                console.log('❌ Invalid placement');
            }
            return;
        }
        
        console.log('❌ No action taken');
    }

    handleMouseMove(e) {
        // Not needed for click-select-place mechanism
    }

    handleMouseUp(e) {
        // Not needed for click-select-place mechanism
    }

    handleTouchStart(e) {
        if (this.gameState !== 'playing') return;
        
        // Mark touch time so synthetic mouse events fired after touch can be ignored
        // (but do NOT preventDefault, so page scrolling still works)
        this.lastTouchTime = Date.now();
        
        const touch = e.touches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
        const x = coords.x;
        const y = coords.y;
        
        // Check buttons first
        if (this.clearButtonRect && 
            x >= this.clearButtonRect.x && x <= this.clearButtonRect.x + this.clearButtonRect.width &&
            y >= this.clearButtonRect.y && y <= this.clearButtonRect.y + this.clearButtonRect.height) {
            this.clearAnswer();
            return;
        }
        
        if (this.submitButtonRect &&
            x >= this.submitButtonRect.x && x <= this.submitButtonRect.x + this.submitButtonRect.width &&
            y >= this.submitButtonRect.y && y <= this.submitButtonRect.y + this.submitButtonRect.height) {
            this.submitAnswer();
            return;
        }
        
        // Check if clicking on a task in available area
        const clickedTask = this.getTaskAtPosition(x, y);
        if (clickedTask && !clickedTask.isPlaced) {
            // Select/deselect task
            if (this.selectedTask && this.selectedTask.code === clickedTask.code) {
                this.selectedTask = null;
            } else {
                this.selectedTask = clickedTask;
            }
            return;
        }
        
        // Check if clicking on grid to place selected task
        const gridX = this.gridStartX;
        const gridY = this.gridStartY;
        
        if (this.selectedTask && 
            x >= gridX && x <= gridX + this.gridWidth &&
            y >= gridY && y <= gridY + this.gridHeight) {
            // Place selected task on grid
            const row = Math.floor((y - gridY) / this.cellSize);
            const col = Math.floor((x - gridX) / this.cellSize);
            
            if (this.isValidPlacement(this.selectedTask.code, row, col, this.selectedTask.duration)) {
                this.taskPlacements[this.selectedTask.code] = { row, col, duration: this.selectedTask.duration };
                this.selectedTask = null;
            }
        }
    }

    handleTouchMove(e) {
        // Not needed for click-select-place mechanism
    }

    handleTouchEnd(e) {
        // Not needed for click-select-place mechanism
    }

    // Single source of truth for available task layout positions
    getAvailableTaskRects() {
        const margin = this.isMobile ? 10 : 20;
        const taskHeight = this.isMobile ? 44 : 40;
        const taskGap = 6;
        const rowGap = 8;
        const minWidth = this.isMobile ? 36 : 30;
        
        let taskAreaY = this.gridStartY + this.gridHeight + 15 + 10; // +10 for title spacing
        let currentX = this.gridStartX;
        
        const rects = [];
        for (let task of this.currentQuestion.tasks) {
            if (this.taskPlacements[task.code]) continue;
            
            const taskWidth = Math.max(task.duration * this.cellSize, minWidth);
            
            // Wrap to next line if needed (must match drawAvailableTasks logic)
            if (currentX + taskWidth > this.canvas.width - margin) {
                currentX = this.gridStartX;
                taskAreaY += taskHeight + rowGap;
            }
            
            rects.push({
                code: task.code,
                name: task.name,
                duration: task.duration,
                x: currentX,
                y: taskAreaY,
                width: taskWidth,
                height: taskHeight
            });
            
            currentX += taskWidth + taskGap;
        }
        
        return rects;
    }

    getTaskAtPosition(x, y) {
        const gridX = this.gridStartX;
        const gridY = this.gridStartY;
        
        // First check if clicking on placed tasks in grid
        for (let code in this.taskPlacements) {
            const placement = this.taskPlacements[code];
            const task = this.currentQuestion.tasks.find(t => t.code === code);
            
            if (!task) continue;
            
            const taskX = gridX + placement.col * this.cellSize;
            const taskY = gridY + placement.row * this.cellSize;
            const taskWidth = placement.duration * this.cellSize;
            const taskHeight = this.cellSize;
            
            if (x >= taskX && x <= taskX + taskWidth && y >= taskY && y <= taskY + taskHeight) {
                return {
                    code: task.code,
                    name: task.name,
                    duration: task.duration,
                    screenX: taskX,
                    screenY: taskY,
                    isPlaced: true,
                    placement: placement
                };
            }
        }
        
        // Then check available tasks area using shared layout calculation
        const rects = this.getAvailableTaskRects();
        for (const rect of rects) {
            if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                return {
                    code: rect.code,
                    name: rect.name,
                    duration: rect.duration,
                    screenX: rect.x,
                    screenY: rect.y,
                    isPlaced: false
                };
            }
        }
        
        return null;
    }

    snapTaskToGrid(task) {
        const gridY = this.gridStartY;
        const gridX = this.gridStartX;
        
        // Check if task is within grid bounds
        if (task.screenY < gridY || task.screenY > gridY + this.gridHeight ||
            task.screenX < gridX || task.screenX > gridX + this.gridWidth) {
            // Task is outside grid, remove placement if it was placed
            if (task.isPlaced) {
                delete this.taskPlacements[task.code];
            }
            return;
        }
        
        // Snap to grid
        const row = Math.floor((task.screenY - gridY) / this.cellSize);
        const col = Math.floor((task.screenX - gridX) / this.cellSize);
        
        // Validate placement
        if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
            // Check if placement is valid (respects constraints)
            if (this.isValidPlacement(task.code, row, col, task.duration)) {
                this.taskPlacements[task.code] = { row, col, duration: task.duration };
            } else {
                // Invalid placement - remove if was placed, keep in available area if not
                if (task.isPlaced) {
                    delete this.taskPlacements[task.code];
                }
            }
        } else {
            // Outside grid bounds - remove placement if it was placed
            if (task.isPlaced) {
                delete this.taskPlacements[task.code];
            }
        }
    }

    isValidPlacement(taskCode, row, col, duration) {
        const task = this.currentQuestion.tasks.find(t => t.code === taskCode);
        if (!task) return false;
        
        // Check if task fits within grid columns
        if (col + duration > this.gridCols) return false;
        
        // Check if row is within bounds
        if (row < 0 || row >= this.gridRows) return false;
        
        // Check if space is available (no overlap with other tasks)
        for (let code in this.taskPlacements) {
            if (code === taskCode) continue; // Skip self
            
            const placement = this.taskPlacements[code];
            const placedEndCol = placement.col + placement.duration;
            const newEndCol = col + duration;
            
            // Check for time overlap
            const timeOverlap = !(newEndCol <= placement.col || col >= placedEndCol);
            
            if (timeOverlap && placement.row === row) {
                return false; // Same row and time overlap
            }
        }
        
        // Check parallel constraint (max 2 tasks at same time)
        let parallelCount = 1; // Count self
        for (let code in this.taskPlacements) {
            if (code === taskCode) continue;
            
            const placement = this.taskPlacements[code];
            const placedEndCol = placement.col + placement.duration;
            const newEndCol = col + duration;
            
            const timeOverlap = !(newEndCol <= placement.col || col >= placedEndCol);
            if (timeOverlap) {
                parallelCount++;
            }
        }
        
        if (parallelCount > 2) return false;
        
        // Check predecessor constraints
        for (let pred of task.predecessors) {
            const predPlacement = this.taskPlacements[pred];
            if (!predPlacement) return false;
            
            const predEndCol = predPlacement.col + predPlacement.duration;
            if (col < predEndCol) return false;
        }
        
        return true;
    }

    getTasksAtTimeRange(startCol, endCol) {
        const tasks = [];
        for (let code in this.taskPlacements) {
            const placement = this.taskPlacements[code];
            const taskEndCol = placement.col + placement.duration;
            
            if (!(taskEndCol <= startCol || placement.col >= endCol)) {
                tasks.push(this.currentQuestion.tasks.find(t => t.code === code));
            }
        }
        return tasks;
    }

    start(persistentStartTime = null) {
        console.log('Starting The Critical Path game...');
        this.isRunning = true;
        this.gameState = 'playing';
        this.startTime = persistentStartTime || Date.now();
        
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
        console.log('Ending The Critical Path game...');
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
            question: this.currentQuestion.id,
            answer: this.submittedAnswer,
            correct: this.submittedAnswer === this.currentQuestion.answer,
            time: this.endTime - this.startTime,
            finished: this.isFinished
        };
        
        this.emit('gameOver', result);
    }

    submitAnswer() {
        if (this.isFinished) return;
        
        // Require ALL tasks to be placed before submit
        const totalTasks = this.currentQuestion.tasks.length;
        const placedCount = Object.keys(this.taskPlacements).length;
        if (placedCount < totalTasks) {
            const remaining = totalTasks - placedCount;
            alert(`Tempatkan semua task terlebih dahulu! Masih ada ${remaining} task yang belum di-place.`);
            return;
        }
        
        // Get placed task codes in order (sorted by start column)
        const placedTasks = Object.entries(this.taskPlacements)
            .sort((a, b) => a[1].col - b[1].col)
            .map(entry => entry[0]);
        
        // Filter to only critical path tasks (in submitted order) for validation
        const criticalPathSet = new Set(this.currentQuestion.answer);
        const criticalPathInOrder = placedTasks.filter(code => criticalPathSet.has(code));
        
        this.submittedAnswer = placedTasks;
        this.isFinished = true;
        this.endTime = Date.now();
        
        const isCorrect = JSON.stringify(criticalPathInOrder) === JSON.stringify(this.currentQuestion.answer);
        
        console.log('📊 Submission Analysis:');
        console.log('  All placed tasks:', placedTasks);
        console.log('  Critical path subset:', criticalPathInOrder);
        console.log('  Expected answer:', this.currentQuestion.answer);
        console.log('  Correct:', isCorrect);
        
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
            question: this.currentQuestion.id,
            time: this.endTime - this.startTime,
            timestamp: Date.now()
        });
        
        if (isCorrect) {
            this.end();
        } else {
            setTimeout(() => {
                this.taskPlacements = {};
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

    clearAnswer() {
        if (this.isFinished) return;
        this.taskPlacements = {};
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'waiting') {
            this.drawWaitingScreen();
        } else if (this.gameState === 'playing') {
            this.drawGameScreen();
        } else if (this.gameState === 'finished') {
            this.drawFinishedScreen();
        }
        
        // Always continue render loop for smooth animation
        if (this.isRunning) {
            requestAnimationFrame(() => this.render());
        }
    }

    drawWaitingScreen() {
        this.ctx.fillStyle = '#2196F3';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('THE CRITICAL PATH', this.canvas.width / 2, 150);
        
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Project Management Challenge', this.canvas.width / 2, 200);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Team ${this.teamNumber} - ${this.user.nama}`, this.canvas.width / 2, 250);
        
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Arrange tasks to find the critical path', this.canvas.width / 2, 320);
        this.ctx.fillText('Wait for the game to start...', this.canvas.width / 2, 350);
    }

    drawGameScreen() {
        // Title
        this.ctx.fillStyle = '#2196F3';
        this.ctx.font = this.isMobile ? 'bold 18px Arial' : 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FIND THE CRITICAL PATH', this.canvas.width / 2, this.isMobile ? 22 : 30);
        
        // Draw grid
        this.drawGrid();
        
        // Draw placed tasks
        this.drawPlacedTasks();
        
        // Draw available tasks (advances internal Y tracker)
        const afterTasksY = this.drawAvailableTasks();
        
        // Draw constraints & predecessors info section
        const afterInfoY = this.drawTaskInfoSection(afterTasksY + 10);
        
        // Draw instructions
        this.drawInstructions(afterInfoY + 30);
        
        // Draw buttons (at bottom)
        this.drawButtons();
        
        // Draw status
        if (this.isFinished) {
            const isCorrect = this.isAnswerCorrect();
            this.ctx.fillStyle = isCorrect ? '#4CAF50' : '#F44336';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(isCorrect ? 'CORRECT!' : 'WRONG! Try again...', this.canvas.width / 2, this.canvas.height - 70);
        }
    }
    
    // Centralized validation: only critical path tasks (filtered subset of submitted) must match expected answer
    isAnswerCorrect() {
        if (!this.submittedAnswer || !this.currentQuestion) return false;
        const criticalPathSet = new Set(this.currentQuestion.answer);
        const criticalPathInOrder = this.submittedAnswer.filter(code => criticalPathSet.has(code));
        return JSON.stringify(criticalPathInOrder) === JSON.stringify(this.currentQuestion.answer);
    }

    drawGrid() {
        const gridX = this.gridStartX;
        const gridY = this.gridStartY;
        
        // Draw grid cells
        this.ctx.strokeStyle = '#2196F3';
        this.ctx.lineWidth = 0.5;
        
        for (let row = 0; row <= this.gridRows; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(gridX, gridY + row * this.cellSize);
            this.ctx.lineTo(gridX + this.gridWidth, gridY + row * this.cellSize);
            this.ctx.stroke();
        }
        
        for (let col = 0; col <= this.gridCols; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(gridX + col * this.cellSize, gridY);
            this.ctx.lineTo(gridX + col * this.cellSize, gridY + this.gridHeight);
            this.ctx.stroke();
        }
        
        // Draw border
        this.ctx.strokeStyle = '#2196F3';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(gridX, gridY, this.gridWidth, this.gridHeight);
        
        // Draw time axis labels
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = this.isMobile ? '9px Arial' : '11px Arial';
        this.ctx.textAlign = 'center';
        const colStep = this.isMobile ? 5 : 5;
        for (let col = 0; col <= this.gridCols; col += colStep) {
            this.ctx.fillText(col.toString(), gridX + col * this.cellSize, gridY - 4);
        }
    }

    drawPlacedTasks() {
        const gridX = this.gridStartX;
        const gridY = this.gridStartY;
        
        for (let code in this.taskPlacements) {
            const placement = this.taskPlacements[code];
            const task = this.currentQuestion.tasks.find(t => t.code === code);
            
            if (!task) continue;
            
            const x = gridX + placement.col * this.cellSize;
            const y = gridY + placement.row * this.cellSize;
            const width = placement.duration * this.cellSize;
            const height = this.cellSize;
            
            // Draw task block
            const isDragging = this.draggedTask && this.draggedTask.code === code;
            this.ctx.fillStyle = isDragging ? '#1976D2' : '#2196F3';
            this.ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
            
            // Draw border
            this.ctx.strokeStyle = isDragging ? '#1565C0' : '#64B5F6';
            this.ctx.lineWidth = isDragging ? 3 : 2;
            this.ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
            
            // Draw text
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${code}`, x + width / 2, y + height / 2 + 5);
        }
    }

    drawAvailableTasks() {
        const titleY = this.gridStartY + this.gridHeight + 15;
        
        // Section title
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = this.isMobile ? 'bold 14px Arial' : 'bold 13px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Available Tasks (tap to select):', this.gridStartX, titleY);
        
        // Use shared layout calculation for task positions
        const rects = this.getAvailableTaskRects();
        let lastY = titleY + 10;
        
        for (const rect of rects) {
            const isSelected = this.selectedTask && this.selectedTask.code === rect.code;
            
            // Selection glow background
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 183, 77, 0.3)';
                this.ctx.fillRect(rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6);
            }
            
            // Draw task block
            this.ctx.fillStyle = isSelected ? '#FFB74D' : '#2196F3';
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            
            // Border
            this.ctx.strokeStyle = isSelected ? '#FFA726' : '#64B5F6';
            this.ctx.lineWidth = isSelected ? 3 : 2;
            this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            
            // Text - code and duration
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${rect.code}`, rect.x + rect.width / 2, rect.y + 17);
            this.ctx.font = '10px Arial';
            this.ctx.fillText(`${rect.duration}h`, rect.x + rect.width / 2, rect.y + 32);
            
            lastY = Math.max(lastY, rect.y + rect.height);
        }
        
        return lastY;
    }
    
    drawTaskInfoSection(startY) {
        const margin = this.isMobile ? 10 : 20;
        const sectionPadding = 10;
        
        if (this.isMobile) {
            // === MOBILE: Stacked vertical layout ===
            const fullWidth = this.gridWidth;
            
            // Constraints box
            const constraintsHeight = 95;
            this.ctx.fillStyle = 'rgba(33, 150, 243, 0.15)';
            this.ctx.fillRect(this.gridStartX, startY, fullWidth, constraintsHeight);
            this.ctx.strokeStyle = '#2196F3';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(this.gridStartX, startY, fullWidth, constraintsHeight);
            
            this.ctx.fillStyle = '#64B5F6';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('⚠ CONSTRAINTS', this.gridStartX + 10, startY + 18);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            const constraints = [
                '• Max 2 tasks bersamaan',
                '• Non-Stop (tidak boleh dihentikan)',
                '• Zero Gap (start segera setelah prasyarat)'
            ];
            constraints.forEach((text, i) => {
                this.ctx.fillText(text, this.gridStartX + 10, startY + 38 + i * 18);
            });
            
            // Predecessors box (below constraints)
            const predStartY = startY + constraintsHeight + 10;
            const tasks = this.currentQuestion.tasks;
            const predCols = 2;
            const predRowHeight = 18;
            const predRows = Math.ceil(tasks.length / predCols);
            const predHeight = 28 + predRows * predRowHeight + 8;
            
            this.ctx.fillStyle = 'rgba(255, 193, 7, 0.15)';
            this.ctx.fillRect(this.gridStartX, predStartY, fullWidth, predHeight);
            this.ctx.strokeStyle = '#FFC107';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(this.gridStartX, predStartY, fullWidth, predHeight);
            
            this.ctx.fillStyle = '#FFC107';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText('🔗 TASK INFO (code : duration : predecessors)', this.gridStartX + 10, predStartY + 18);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px monospace';
            const colWidth = (fullWidth - 20) / predCols;
            
            tasks.forEach((task, i) => {
                const col = i % predCols;
                const row = Math.floor(i / predCols);
                const tx = this.gridStartX + 10 + col * colWidth;
                const ty = predStartY + 38 + row * predRowHeight;
                
                const predText = task.predecessors.length > 0 ? task.predecessors.join(',') : '-';
                this.ctx.fillText(`${task.code} : ${task.duration}h : ${predText}`, tx, ty);
            });
            
            return predStartY + predHeight;
        } else {
            // === DESKTOP: Side-by-side layout ===
            const sectionWidth = (this.gridWidth - sectionPadding) / 2;
            const sectionHeight = 110;
            
            // Constraints (Left)
            const constraintsX = this.gridStartX;
            this.ctx.fillStyle = 'rgba(33, 150, 243, 0.15)';
            this.ctx.fillRect(constraintsX, startY, sectionWidth, sectionHeight);
            this.ctx.strokeStyle = '#2196F3';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(constraintsX, startY, sectionWidth, sectionHeight);
            
            this.ctx.fillStyle = '#64B5F6';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('⚠ CONSTRAINTS', constraintsX + 10, startY + 20);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px Arial';
            const constraints = [
                '• Limit Paralel: Max 2 tugas bersamaan',
                '• Non-Stop: Tugas tidak boleh dihentikan',
                '• Zero Gap: Start segera setelah prasyarat'
            ];
            constraints.forEach((text, i) => {
                this.ctx.fillText(text, constraintsX + 10, startY + 42 + i * 20);
            });
            
            // Predecessors (Right)
            const predX = this.gridStartX + sectionWidth + sectionPadding;
            this.ctx.fillStyle = 'rgba(255, 193, 7, 0.15)';
            this.ctx.fillRect(predX, startY, sectionWidth, sectionHeight);
            this.ctx.strokeStyle = '#FFC107';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(predX, startY, sectionWidth, sectionHeight);
            
            this.ctx.fillStyle = '#FFC107';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText('🔗 TASKS (code : duration : predecessors)', predX + 10, startY + 20);
            
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '11px monospace';
            const tasks = this.currentQuestion.tasks;
            const cols = 3;
            const colW = (sectionWidth - 20) / cols;
            const rowH = 15;
            
            tasks.forEach((task, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const tx = predX + 10 + col * colW;
                const ty = startY + 40 + row * rowH;
                
                const predText = task.predecessors.length > 0 ? task.predecessors.join(',') : '-';
                this.ctx.fillText(`${task.code}:${task.duration}h:${predText}`, tx, ty);
            });
            
            return startY + sectionHeight;
        }
    }

    drawButtons() {
        const buttonWidth = this.isMobile ? 140 : 120;
        const buttonHeight = this.isMobile ? 48 : 40;
        const spacing = this.isMobile ? 20 : 30;
        const buttonY = this.canvas.height - buttonHeight - 15;
        
        const clearButtonX = this.canvas.width / 2 - buttonWidth - spacing / 2;
        const submitButtonX = this.canvas.width / 2 + spacing / 2;
        
        // Clear button
        this.ctx.fillStyle = '#F44336';
        this.ctx.fillRect(clearButtonX, buttonY, buttonWidth, buttonHeight);
        this.ctx.strokeStyle = '#D32F2F';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(clearButtonX, buttonY, buttonWidth, buttonHeight);
        
        const fontSize = this.isMobile ? 16 : 15;
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CLEAR', clearButtonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
        
        // Submit button
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(submitButtonX, buttonY, buttonWidth, buttonHeight);
        this.ctx.strokeStyle = '#388E3C';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(submitButtonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SUBMIT', submitButtonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
        
        // Store button positions for click detection
        this.clearButtonRect = { x: clearButtonX, y: buttonY, width: buttonWidth, height: buttonHeight };
        this.submitButtonRect = { x: submitButtonX, y: buttonY, width: buttonWidth, height: buttonHeight };
    }
    
    drawInstructions(startY) {
        const y = startY || (this.canvas.height - 130);
        const fontSize = this.isMobile ? 13 : 13;
        
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.fillText('HOW TO PLAY:', this.gridStartX, y);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = `${fontSize}px Arial`;
        const lineH = this.isMobile ? 18 : 16;
        this.ctx.fillText('1. Tap a task to select (orange border)', this.gridStartX, y + lineH);
        this.ctx.fillText('2. Tap a grid cell to place selected task', this.gridStartX, y + lineH * 2);
        this.ctx.fillText('3. Use CLEAR to reset, SUBMIT to check', this.gridStartX, y + lineH * 3);
    }

    drawFinishedScreen() {
        const isCorrect = this.isAnswerCorrect();
        const time = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        this.ctx.fillStyle = isCorrect ? '#4CAF50' : '#F44336';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(isCorrect ? 'MISSION COMPLETE!' : 'TRY AGAIN NEXT TIME', this.canvas.width / 2, 150);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Team ${this.teamNumber}`, this.canvas.width / 2, 220);
        this.ctx.fillText(`Time: ${time} seconds`, this.canvas.width / 2, 260);
        
        if (isCorrect) {
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('Congratulations! Well done!', this.canvas.width / 2, 320);
        } else {
            // Show critical path subset that was actually validated
            const criticalPathSet = new Set(this.currentQuestion.answer);
            const yourCriticalPath = this.submittedAnswer.filter(code => criticalPathSet.has(code));
            
            this.ctx.fillStyle = '#F44336';
            this.ctx.font = '18px Arial';
            this.ctx.fillText(`Your critical path: ${yourCriticalPath.join(', ')}`, this.canvas.width / 2, 320);
            this.ctx.fillText(`Correct critical path: ${this.currentQuestion.answer.join(', ')}`, this.canvas.width / 2, 350);
        }
        
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Redirecting to results...', this.canvas.width / 2, 450);
    }

    showError(message) {
        console.error('Game error:', message);
        this.emit('error', new Error(message));
    }

    cleanup() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        console.log('The Critical Path game cleaned up');
    }
}

// Export for global access
window.GameInstance = GameInstance;
