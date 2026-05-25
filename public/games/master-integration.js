class GameInstance {
  constructor(options) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.socket = options.socket;
    this.user = options.user;
    this.game = options.game;
    this.gameId = options.gameId;
    this.startTime = options.startTime || null;
    console.log("startTime: " + (this.startTime ? (Date.now() - this.startTime) : 'null'));
    
    this.events = {};
    this.isRunning = false;
    this.gameState = 'waiting';
    
    this.question = null;
    this.numbers = [];
    this.target = 0;
    this.userInput = '';
    this.isFinished = false;
    this.isCorrect = false;
    this.feedback = '';
    this.teamNumber = null;
    this.questions = [];
    
    this.numberButtons = [];
    this.operatorButtons = [];
    this.selectedElements = [];
    
    this.gameEnded = false;
    this.rewardsData = null;
    
    this.isMobile = this.detectMobile();
    
    this.colors = {
      background: '#FFF8F0',
      primary: '#F5E6D3',
      secondary: '#E8D4C4',
      accent: '#D4A5A5',
      accentLight: '#F0C4C4',
      text: '#5C4033',
      correct: '#A8D5BA',
      wrong: '#F4A9A8',
      button: '#F5D5C8',
      buttonHover: '#E8C4B8'
    };
    
    this.setupCanvas();
    this.loadQuestions();
  }
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768 && 'ontouchstart' in window);
  }
  
  setupCanvas() {
    console.log('📱 Mobile detection:', this.isMobile, 'Window width:', window.innerWidth);
    
    if (this.isMobile) {
      this.canvas.width = Math.min(window.innerWidth - 20, 400);
      this.canvas.height = Math.min(window.innerHeight - 200, 600);
    } else {
      this.canvas.width = 900;
      this.canvas.height = 800;
    }
    
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.maxHeight = '100%';
    this.canvas.style.border = '2px solid #D4A5A5';
    this.canvas.style.borderRadius = '8px';
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
      const response = await fetch('/data/master-integration-questions.json');
      this.questions = await response.json();
      console.log('Questions loaded:', this.questions.length);
    } catch (error) {
      console.error('Error loading questions:', error);
      this.questions = [];
    }
  }
  
  async init() {
    console.log('🎮 Initializing The Master Integration game...');
    console.log('User:', this.user);
    console.log('Game:', this.game);
    
    // Wait for questions to load if not already loaded
    if (this.questions.length === 0) {
      console.log('⏳ Waiting for questions to load...');
      await this.loadQuestions();
    }
    
    // Determine team number from user data
    this.teamNumber = this.extractTeamNumber();
    
    console.log('Looking for question for Team', this.teamNumber);
    console.log('Available questions:', this.questions.map(q => q.team));
    
    // Get question for this team
    this.question = this.questions.find(q => q.team === `Team ${this.teamNumber}`);
    
    if (!this.question) {
      this.showError('No question assigned for your team');
      return;
    }
    
    this.numbers = this.question.numbers;
    this.target = this.question.target;
    
    console.log('Question loaded:', this.question);
    
    // Join game room to receive game-ended and rewards-distributed events
    if (this.gameId) {
      console.log('🎮 Joining game room:', 'game-' + this.gameId);
      this.socket.emit('join-game', { gameId: this.gameId, user: this.user });
    }
    
    // Listen for game ended event
    this.socket.on('game-ended', (data) => {
      console.log('🏁 Game ended by admin, data:', data);
      this.gameEnded = true;
      this.checkAndRedirect();
    });
    
    // Listen for rewards distribution event
    this.socket.on('rewards-distributed', (data) => {
      console.log('🎁 Rewards distributed by admin:', data);
      this.rewardsData = data;
      this.checkAndRedirect();
    });
    
    // Setup controls
    this.setupControls();
    
    // Auto-start game for immediate play
    this.start(this.startTime);
    
    // Start render loop
    this.render();
    
    this.emit('ready');
  }
  
  checkAndRedirect() {
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
        window.location.href = fallbackUrl;
      }
    }
  }
  
  extractTeamNumber() {
    let teamName = this.user.tim || this.user.team || this.user.bds_team;
    
    console.log('Extracting team number from:', teamName);
    
    if (!teamName) {
      console.log('No team name found, defaulting to Team 0');
      return 0;
    }
    
    const match = teamName.toString().match(/(\d+)/);
    const teamNumber = match ? parseInt(match[1]) : 0;
    
    console.log('Extracted team number:', teamNumber);
    return teamNumber;
  }
  
  start(startTime) {
    console.log('🎮 Starting game with startTime:', startTime);
    this.startTime = startTime;
    this.isRunning = true;
    this.gameState = 'playing';
    
    const elapsedTime = Date.now() - this.startTime;
    
    // Emit game-progress to notify admin that game has started
    this.socket.emit('game-progress', {
      gameId: this.gameId,
      gameStatus: 'playing',
      teamProgress: {
        [this.user.tim]: {
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
            [this.user.tim]: {
              started: true,
              completed: false,
              player: this.user,
              time: elapsedTime
            }
          }
        });
      }
    }, 500);
  }
  
  
  setupControls() {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
  }
  
  handleCanvasClick(e) {
    if (this.isFinished) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check number buttons
    for (let btn of this.numberButtons) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.selectNumber(btn.number);
        return;
      }
    }
    
    // Check operator buttons
    for (let btn of this.operatorButtons) {
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        this.selectOperator(btn.operator);
        return;
      }
    }
    
    // Check submit button
    if (this.submitButton && x >= this.submitButton.x && x <= this.submitButton.x + this.submitButton.width &&
        y >= this.submitButton.y && y <= this.submitButton.y + this.submitButton.height) {
      this.submitAnswer();
      return;
    }
    
    // Check clear button
    if (this.clearButton && x >= this.clearButton.x && x <= this.clearButton.x + this.clearButton.width &&
        y >= this.clearButton.y && y <= this.clearButton.y + this.clearButton.height) {
      this.clearInput();
      return;
    }
  }
  
  selectNumber(number) {
    // Check if this number has already been used
    const usedNumbers = this.selectedElements.filter(el => typeof el === 'number');
    if (usedNumbers.includes(number)) {
      this.feedback = 'Each number can only be used once';
      return;
    }
    
    // Only allow 3 numbers max
    if (usedNumbers.length < 3) {
      this.selectedElements.push(number);
      this.feedback = '';
      this.updateDisplay();
    }
  }
  
  selectOperator(operator) {
    // Allow all operators and parentheses to be appended
    this.selectedElements.push(operator);
    this.feedback = '';
    this.updateDisplay();
  }
  
  updateDisplay() {
    console.log('Updating display with:', this.selectedElements);
    let display = '';
    for (let i = 0; i < this.selectedElements.length; i++) {
      const el = this.selectedElements[i];
      display = display + ' ' + el;
    }
    this.userInput = display;
  }
  
  clearInput() {
    this.selectedElements = [];
    this.userInput = '';
    this.feedback = '';
  }
  
  submitAnswer() {
    // Validasi: harus ada 3 angka
    const numbers = this.selectedElements.filter(el => typeof el === 'number');
    if (numbers.length !== 3) {
      this.feedback = 'Please select 3 numbers';
      return;
    }
    
    try {
      const result = this.evaluateExpression();
      this.isCorrect = result === this.target;
      
      if (this.isCorrect) {
        this.feedback = '✓ Correct Answer!';
        this.isFinished = true;
        this.end();
      } else {
        this.feedback = '✗ Wrong Answer';
      }
    } catch (error) {
      console.error('Expression evaluation error:', error);
      this.feedback = '✗ Wrong Answer';
    }
  }
  
  evaluateExpression() {
    // Build expression from selectedElements
    let expression = '';
    for (let el of this.selectedElements) {
      if (typeof el === 'number') {
        expression += el;
      } else {
        expression += el;
      }
    }
    
    console.log('Evaluating expression:', expression);
    
    // Evaluate using Function constructor (safe for math expressions)
    const result = Function('"use strict"; return (' + expression + ')')();
    return result;
  }
  
  end() {
    this.isRunning = false;
    this.gameState = 'finished';
    
    // Stop progress updates
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
    
    const data = {
      gameId: this.gameId,
      user: this.user,
      team: this.user.tim,
      answer: this.userInput,
      correct: this.isCorrect,
      time: elapsedTime,
      timestamp: Date.now()
    };
    
    this.socket.emit('answer-submitted', data);
    
    // Emit game-progress to notify admin that player completed
    this.socket.emit('game-progress', {
      gameId: this.gameId,
      gameStatus: 'playing',
      teamProgress: {
        [this.user.tim]: {
          started: true,
          completed: true,
          player: this.user,
          time: elapsedTime,
          answer: this.userInput,
          correct: this.isCorrect
        }
      }
    });
    
    this.socket.emit('game-activity', {
      gameId: this.gameId,
      type: 'answer_submitted',
      user: this.user,
      team: this.user.tim,
      answer: this.userInput,
      correct: this.isCorrect,
      time: elapsedTime
    });
    
    this.emit('gameOver', { correct: this.isCorrect, time: elapsedTime });
  }
  
  render() {
    if (!this.isRunning) return;
    
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawGameScreen();
    this.drawNumbers();
    this.drawOperators();
    this.drawDisplay();
    this.drawTarget();
    this.drawButtons();
    
    requestAnimationFrame(() => this.render());
  }
  
  drawGameScreen() {
    const padding = this.isMobile ? 10 : 30;
    const titleSize = this.isMobile ? 14 : 18;
    
    // Title
    this.ctx.font = `bold ${titleSize}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Construct a math equation to get the target result', this.canvas.width / 2, padding + titleSize);
  }
  
  drawTarget() {
    const centerX = this.canvas.width / 2;
    const targetY = this.isMobile ? 70 : 100;
    
    // Target box
    const boxWidth = this.isMobile ? 200 : 250;
    const boxHeight = this.isMobile ? 90 : 80;
    
    this.ctx.fillStyle = this.colors.accentLight;
    this.ctx.fillRect(centerX - boxWidth / 2, targetY, boxWidth, boxHeight);
    
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(centerX - boxWidth / 2, targetY, boxWidth, boxHeight);
    
    this.ctx.font = `${this.isMobile ? 12 : 14}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Target Result', centerX, targetY + 20);
    
    this.ctx.font = `bold ${this.isMobile ? 32 : 40}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.accent;
    this.ctx.fillText(this.target, centerX, targetY + 60);
  }
  
  drawDisplay() {
    const centerX = this.canvas.width / 2;
    const displayY = this.isMobile ? 240 : 300;
    
    // Display box
    const boxWidth = this.isMobile ? 280 : 350;
    const boxHeight = this.isMobile ? 70 : 90;
    
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fillRect(centerX - boxWidth / 2, displayY, boxWidth, boxHeight);
    
    this.ctx.strokeStyle = this.colors.secondary;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(centerX - boxWidth / 2, displayY, boxWidth, boxHeight);
    
    // Display text
    this.ctx.font = `${this.isMobile ? 18 : 24}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.userInput || 'Select numbers and operators', centerX, displayY + 35);
    
    // Feedback
    if (this.feedback) {
      const feedbackColor = this.isCorrect ? this.colors.correct : this.colors.wrong;
      this.ctx.fillStyle = feedbackColor;
      this.ctx.font = `bold ${this.isMobile ? 14 : 16}px 'Segoe UI', sans-serif`;
      this.ctx.fillText(this.feedback, centerX, displayY + 65);
    }
  }
  
  drawNumbers() {
    const startY = this.isMobile ? 360 : 450;
    const buttonSize = this.isMobile ? 50 : 60;
    const gap = this.isMobile ? 10 : 15;
    const centerX = this.canvas.width / 2;
    
    this.numberButtons = [];
    
    this.ctx.font = `bold ${this.isMobile ? 12 : 14}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Numbers', centerX, startY - 20);
    
    const totalWidth = (this.numbers.length * buttonSize) + ((this.numbers.length - 1) * gap);
    const startX = centerX - totalWidth / 2;
    
    for (let i = 0; i < this.numbers.length; i++) {
      const x = startX + (i * (buttonSize + gap));
      const y = startY;
      
      this.drawButton(x, y, buttonSize, buttonSize, this.numbers[i].toString(), this.colors.button);
      
      this.numberButtons.push({
        x: x,
        y: y,
        width: buttonSize,
        height: buttonSize,
        number: this.numbers[i]
      });
    }
  }
  
  drawOperators() {
    const startY = this.isMobile ? 440 : 560;
    const buttonSize = this.isMobile ? 45 : 55;
    const gap = this.isMobile ? 8 : 12;
    const centerX = this.canvas.width / 2;
    
    const operators = ['+', '-', '×', '÷', '(', ')'];
    this.operatorButtons = [];
    
    this.ctx.font = `bold ${this.isMobile ? 12 : 14}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Operators', centerX, startY - 20);
    
    const totalWidth = (operators.length * buttonSize) + ((operators.length - 1) * gap);
    const startX = centerX - totalWidth / 2;
    
    for (let i = 0; i < operators.length; i++) {
      const x = startX + (i * (buttonSize + gap));
      const y = startY;
      
      this.drawButton(x, y, buttonSize, buttonSize, operators[i], this.colors.button);
      
      this.operatorButtons.push({
        x: x,
        y: y,
        width: buttonSize,
        height: buttonSize,
        operator: operators[i]
      });
    }
  }
  
  drawButtons() {
    const buttonY = this.isMobile ? 540 : 680;
    const buttonWidth = this.isMobile ? 100 : 120;
    const buttonHeight = this.isMobile ? 40 : 50;
    const gap = this.isMobile ? 15 : 20;
    const centerX = this.canvas.width / 2;
    
    // Submit button
    const submitX = centerX - buttonWidth - gap / 2;
    this.drawButton(submitX, buttonY, buttonWidth, buttonHeight, 'Submit', this.colors.accent);
    this.submitButton = { x: submitX, y: buttonY, width: buttonWidth, height: buttonHeight };
    
    // Clear button
    const clearX = centerX + gap / 2;
    this.drawButton(clearX, buttonY, buttonWidth, buttonHeight, 'Clear', this.colors.accentLight);
    this.clearButton = { x: clearX, y: buttonY, width: buttonWidth, height: buttonHeight };
  }
  
  drawButton(x, y, width, height, text, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
    
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(x, y, width, height);
    
    this.ctx.font = `bold ${this.isMobile ? 12 : 14}px 'Segoe UI', sans-serif`;
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + width / 2, y + height / 2);
  }
  
  showError(message) {
    console.error('Game Error:', message);
  }
}

// Ensure GameInstance is available globally
window.GameInstance = GameInstance;
console.log('✅ GameInstance registered globally');
