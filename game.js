class Game2048 {
    constructor() {
        this.gridSize = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.history = [];
        this.maxHistorySize = 10;
        
        // Power-ups
        this.powerups = {
            undo: 3,
            shuffle: 2,
            remove: 2,
            swap: 0,
            lock: 0,
            double: 0
        };
        
        this.gameOver = false;
        this.won = false;
        
        // Selection mode for remove, swap, lock, and double powerups
        this.selectionMode = false;
        this.selectionOverlay = null;
        this.swapMode = false;
        this.firstSwapTile = null;
        this.lockMode = false;
        this.doubleMode = false;
        this.lockedTiles = []; // Array of {row, col, movesRemaining}
        
        // Touch support
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // Theme System
        this.currentTheme = 'default';
        this.themes = {
            default: { 
                name: 'Dark Mode', 
                unlocked: true,
                description: 'Classic dark theme'
            },
            cyberpunk: { 
                name: 'Neon Cyberpunk', 
                unlockedAt: 1024, 
                unlocked: false,
                description: 'Pink/cyan neon aesthetic'
            },
            vaporwave: { 
                name: 'Vaporwave', 
                unlockedAt: 2048, 
                unlocked: false,
                description: 'Purple/pink retro vibes'
            },
            matrix: { 
                name: 'Matrix', 
                unlockedAt: 4096, 
                unlocked: false,
                description: 'Green terminal hacker mode'
            }
        };
        
        // Particle System
        this.particleSystem = null;
        
        // Achievement System
        this.achievements = {
            speedDemon: {
                id: 'speedDemon',
                name: 'Speed Demon',
                description: 'Reach 2048 in under 150 moves',
                icon: '⚡',
                requirement: { type: 'moves', target: 2048, maxMoves: 150 },
                unlocked: false
            },
            minimalist: {
                id: 'minimalist',
                name: 'Minimalist',
                description: 'Reach 2048 using ≤5 total powerups',
                icon: '🎯',
                requirement: { type: 'powerups', target: 2048, maxPowerups: 5 },
                unlocked: false
            },
            noUndo: {
                id: 'noUndo',
                name: 'No Undo',
                description: 'Reach 2048 without using undo',
                icon: '🚫',
                requirement: { type: 'noPowerup', target: 2048, powerup: 'undo' },
                unlocked: false
            },
            lockMaster: {
                id: 'lockMaster',
                name: 'Lock Master',
                description: 'Successfully use lock 10 times',
                icon: '🔒',
                requirement: { type: 'powerupCount', powerup: 'lock', count: 10 },
                unlocked: false
            },
            swapExpert: {
                id: 'swapExpert',
                name: 'Swap Expert',
                description: 'Use swap 25 times',
                icon: '🔄',
                requirement: { type: 'powerupCount', powerup: 'swap', count: 25 },
                unlocked: false
            },
            hoarder: {
                id: 'hoarder',
                name: 'Powerup Hoarder',
                description: 'Have 5+ of every powerup simultaneously',
                icon: '💰',
                requirement: { type: 'hoarder', minEach: 5 },
                unlocked: false
            },
            perfectGame: {
                id: 'perfectGame',
                name: 'Perfect Game',
                description: 'Reach 4096 with no tile removals',
                icon: '💎',
                requirement: { type: 'noPowerup', target: 4096, powerup: 'remove' },
                unlocked: false
            },
            secretHunter: {
                id: 'secretHunter',
                name: 'Secret Hunter',
                description: 'Discover all hidden secrets',
                icon: '🔍',
                requirement: { type: 'secrets', target: 3 },
                unlocked: false,
                hidden: true // Hidden achievement!
            }
        };
        
        // Stats tracking for current game
        this.stats = {
            currentGameMoves: 0,
            currentGamePowerupsUsed: 0,
            currentGameUsedUndo: false,
            currentGameUsedRemove: false
        };
        
        // Lifetime stats
        this.lifetimeStats = {
            lockUses: 0,
            swapUses: 0
        };
        
        // Global Statistics
        this.globalStats = {
            totalGamesPlayed: 0,
            totalGamesWon: 0,
            totalScore: 0,
            totalMoves: 0,
            totalTilesMerged: 0,
            totalPowerupsUsed: 0,
            highestTile: 0,
            fastestWin: Infinity,
            longestStreak: 0,
            currentStreak: 0,
            totalPlayTime: 0,
            averageScore: 0,
            winRate: 0
        };
        
        this.gameStartTime = null;
        
        // Sound System
        this.audioContext = null;
        this.soundEnabled = true;
        this.masterVolume = 0.3;
        
        // Easter Eggs
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiProgress = [];
        this.devConsoleEnabled = false;
        this.secretsUnlocked = {
            konami: false,
            devConsole: false,
            mega: false // For reaching 8192+
        };
        
        this.init();
    }
    
    init() {
        this.loadGridSize();
        this.loadThemeProgress();
        this.loadAchievements();
        this.loadStatistics();
        this.loadSoundSettings();
        this.initAudioContext();
        this.initEasterEggs();
        this.showConsoleArt();
        this.setupGrid();
        this.setupParticleSystem();
        this.setupEventListeners();
        this.updateBestScore();
        this.updatePowerupCounts();
        
        // Try to load saved game, if not start new
        if (!this.loadGame()) {
            this.newGame();
        }
    }
    
    setupGrid() {
        const gridContainer = document.getElementById('grid-container');
        gridContainer.innerHTML = '';
        
        // Set CSS custom property for grid size
        gridContainer.style.setProperty('--grid-size', this.gridSize);
        
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            gridContainer.appendChild(cell);
        }
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Touch controls
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Button controls
        document.getElementById('new-game').addEventListener('click', () => this.confirmNewGame());
        document.getElementById('modal-new-game').addEventListener('click', () => {
            this.closeModal();
            this.newGame();
        });
        document.getElementById('modal-continue').addEventListener('click', () => {
            this.closeModal();
        });
        document.getElementById('modal-undo').addEventListener('click', () => {
            this.undoFromGameOver();
        });
        
        // Power-up buttons
        document.getElementById('swap-btn').addEventListener('click', () => this.usePowerup('swap'));
        document.getElementById('undo-btn').addEventListener('click', () => this.usePowerup('undo'));
        document.getElementById('shuffle-btn').addEventListener('click', () => this.usePowerup('shuffle'));
        document.getElementById('remove-btn').addEventListener('click', () => this.usePowerup('remove'));
        document.getElementById('lock-btn').addEventListener('click', () => this.usePowerup('lock'));
        document.getElementById('double-btn').addEventListener('click', () => this.usePowerup('double'));
    }
    
    confirmNewGame() {
        if (this.score > 0) {
            const confirmed = confirm('⚠️ Start a new game?\n\nYour current progress will be lost!\n\nScore: ' + this.score);
            if (!confirmed) {
                return;
            }
        }
        this.newGame();
    }
    
    newGame() {
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.history = [];
        this.gameOver = false;
        this.won = false;
        this.boostActive = false;
        
        // Reset power-ups
        this.powerups = {
            undo: 3,
            shuffle: 2,
            remove: 2,
            swap: 0,
            lock: 0,
            double: 0
        };
        
        this.lockedTiles = [];
        
        // Reset current game stats
        this.stats = {
            currentGameMoves: 0,
            currentGamePowerupsUsed: 0,
            currentGameUsedUndo: false,
            currentGameUsedRemove: false
        };
        
        // Track game start time
        this.gameStartTime = Date.now();
        
        // Reset to default theme on new game
        this.switchTheme('default');
        
        this.updateScore();
        this.updatePowerupCounts();
        this.updateGameStatus('');
        
        // Add initial tiles (more for larger grids)
        const initialTiles = this.gridSize === 5 ? 3 : 2;
        for (let i = 0; i < initialTiles; i++) {
            this.addRandomTile();
        }
        
        this.render();
        this.saveGame();
    }
    
    saveGame() {
        const gameState = {
            grid: this.grid,
            score: this.score,
            powerups: this.powerups,
            gameOver: this.gameOver,
            won: this.won,
            lockedTiles: this.lockedTiles,
            history: this.history
        };
        localStorage.setItem('gameState', JSON.stringify(gameState));
    }
    
    loadGame() {
        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.grid = state.grid;
                this.score = state.score;
                this.powerups = state.powerups;
                this.gameOver = state.gameOver;
                this.won = state.won;
                this.lockedTiles = state.lockedTiles || [];
                this.history = state.history || [];
                
                this.updateScore();
                this.updatePowerupCounts();
                this.render();
                
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }
    
    saveState() {
        if (this.history.length >= this.maxHistorySize) {
            this.history.shift();
        }
        
        this.history.push({
            grid: this.grid.map(row => [...row]),
            score: this.score,
            powerups: { ...this.powerups }
        });
    }
    
    addRandomTile() {
        const emptyCells = [];
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    handleKeyPress(e) {
        if (this.gameOver || this.selectionMode) return;
        
        const key = e.key;
        let moved = false;
        
        if (key === 'ArrowUp') {
            e.preventDefault();
            moved = this.move('up');
        } else if (key === 'ArrowDown') {
            e.preventDefault();
            moved = this.move('down');
        } else if (key === 'ArrowLeft') {
            e.preventDefault();
            moved = this.move('left');
        } else if (key === 'ArrowRight') {
            e.preventDefault();
            moved = this.move('right');
        }
        
        if (moved) {
            this.afterMove();
        }
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }
    
    handleTouchEnd(e) {
        if (this.gameOver || this.selectionMode) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        
        const minSwipeDistance = 30;
        let moved = false;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                moved = this.move('right');
            } else {
                moved = this.move('left');
            }
        } else if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                moved = this.move('down');
            } else {
                moved = this.move('up');
            }
        }
        
        if (moved) {
            this.afterMove();
        }
    }
    
    move(direction) {
        this.saveState();
        
        const oldGrid = this.grid.map(row => [...row]);
        let moved = false;
        
        if (direction === 'left') {
            moved = this.moveLeft();
        } else if (direction === 'right') {
            moved = this.moveRight();
        } else if (direction === 'up') {
            moved = this.moveUp();
        } else if (direction === 'down') {
            moved = this.moveDown();
        }
        
        if (!moved) {
            this.history.pop(); // Remove saved state if no move occurred
        } else {
            // Track move for achievements
            this.stats.currentGameMoves++;
            
            // Decrement locked tiles moves remaining
            this.lockedTiles = this.lockedTiles.filter(tile => {
                tile.movesRemaining--;
                if (tile.movesRemaining <= 0) {
                    this.showMessage(`Tile at (${tile.row + 1}, ${tile.col + 1}) unlocked!`, 'info');
                    return false;
                }
                return true;
            });
        }
        
        return moved;
    }
    
    moveLeft() {
        let moved = false;
        
        for (let r = 0; r < this.gridSize; r++) {
            const row = this.grid[r].filter(val => val !== 0);
            const merged = [];
            let col = 0; // Track column position for particles
            
            for (let i = 0; i < row.length; i++) {
                if (i < row.length - 1 && row[i] === row[i + 1]) {
                    const newValue = row[i] * 2;
                    merged.push(newValue);
                    this.score += newValue;
                    this.checkForPowerupReward(newValue);
                    
                    // Emit particles at merge position
                    this.emitMergeParticles(r, col, newValue);
                    
                    i++;
                    
                    if (newValue === 2048 && !this.won) {
                        this.showVictory();
                    }
                } else {
                    merged.push(row[i]);
                }
                col++;
            }
            
            while (merged.length < this.gridSize) {
                merged.push(0);
            }
            
            if (JSON.stringify(this.grid[r]) !== JSON.stringify(merged)) {
                moved = true;
            }
            
            this.grid[r] = merged;
        }
        
        return moved;
    }
    
    moveRight() {
        let moved = false;
        
        for (let r = 0; r < this.gridSize; r++) {
            const row = this.grid[r].filter(val => val !== 0);
            const merged = [];
            
            for (let i = row.length - 1; i >= 0; i--) {
                if (i > 0 && row[i] === row[i - 1]) {
                    const newValue = row[i] * 2;
                    merged.unshift(newValue);
                    this.score += newValue;
                    this.checkForPowerupReward(newValue);
                    
                    // Emit particles at merge position (right side)
                    const col = this.gridSize - merged.length;
                    this.emitMergeParticles(r, col, newValue);
                    
                    i--;
                    
                    if (newValue === 2048 && !this.won) {
                        this.showVictory();
                    }
                } else {
                    merged.unshift(row[i]);
                }
            }
            
            while (merged.length < this.gridSize) {
                merged.unshift(0);
            }
            
            if (JSON.stringify(this.grid[r]) !== JSON.stringify(merged)) {
                moved = true;
            }
            
            this.grid[r] = merged;
        }
        
        return moved;
    }
    
    moveUp() {
        let moved = false;
        
        for (let c = 0; c < this.gridSize; c++) {
            const col = [];
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] !== 0) {
                    col.push(this.grid[r][c]);
                }
            }
            
            const merged = [];
            let row = 0; // Track row position for particles
            
            for (let i = 0; i < col.length; i++) {
                if (i < col.length - 1 && col[i] === col[i + 1]) {
                    const newValue = col[i] * 2;
                    merged.push(newValue);
                    this.score += newValue;
                    this.checkForPowerupReward(newValue);
                    
                    // Emit particles at merge position
                    this.emitMergeParticles(row, c, newValue);
                    
                    i++;
                    
                    if (newValue === 2048 && !this.won) {
                        this.showVictory();
                    }
                } else {
                    merged.push(col[i]);
                }
                row++;
            }
            
            while (merged.length < this.gridSize) {
                merged.push(0);
            }
            
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] !== merged[r]) {
                    moved = true;
                }
                this.grid[r][c] = merged[r];
            }
        }
        
        return moved;
    }
    
    moveDown() {
        let moved = false;
        
        for (let c = 0; c < this.gridSize; c++) {
            const col = [];
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] !== 0) {
                    col.push(this.grid[r][c]);
                }
            }
            
            const merged = [];
            for (let i = col.length - 1; i >= 0; i--) {
                if (i > 0 && col[i] === col[i - 1]) {
                    const newValue = col[i] * 2;
                    merged.unshift(newValue);
                    this.score += newValue;
                    this.globalStats.totalTilesMerged++;
                    this.playMergeSound(newValue);
                    this.checkForPowerupReward(newValue);
                    
                    // Emit particles at merge position (bottom)
                    const row = this.gridSize - merged.length;
                    this.emitMergeParticles(row, c, newValue);
                    
                    i--;
                    
                    if (newValue === 2048 && !this.won) {
                        this.showVictory();
                    }
                } else {
                    merged.unshift(col[i]);
                }
            }
            
            while (merged.length < this.gridSize) {
                merged.unshift(0);
            }
            
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] !== merged[r]) {
                    moved = true;
                }
                this.grid[r][c] = merged[r];
            }
        }
        
        return moved;
    }
    
    afterMove() {
        this.addRandomTile();
        this.updateScore();
        this.render();
        this.saveGame();
        
        if (!this.canMove()) {
            this.gameOver = true;
            this.showGameOver();
        }
    }
    
    canMove() {
        // Check for empty cells
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) return true;
            }
        }
        
        // Check for possible merges
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const current = this.grid[r][c];
                if (c < this.gridSize - 1 && current === this.grid[r][c + 1]) return true;
                if (r < this.gridSize - 1 && current === this.grid[r + 1][c]) return true;
            }
        }
        
        return false;
    }
    
    // Power-up implementations
    usePowerup(type) {
        if (this.gameOver) return;
        
        if (this.powerups[type] <= 0) {
            this.showMessage('No more ' + type + ' power-ups!', 'error');
            return;
        }
        
        // Track powerup usage
        this.stats.currentGamePowerupsUsed++;
        if (type === 'undo') this.stats.currentGameUsedUndo = true;
        if (type === 'remove') this.stats.currentGameUsedRemove = true;
        if (type === 'lock') this.lifetimeStats.lockUses++;
        if (type === 'swap') this.lifetimeStats.swapUses++;
        
        this.playPowerupSound(type);
        
        switch(type) {
            case 'swap':
                this.swapTiles();
                break;
            case 'undo':
                this.undo();
                break;
            case 'shuffle':
                this.shuffleTiles();
                break;
            case 'remove':
                this.removeLowestTile();
                break;
            case 'lock':
                this.lockTile();
                break;
            case 'double':
                this.doubleTile();
                break;
        }
    }
    
    undo() {
        if (this.history.length === 0) {
            this.showMessage('No moves to undo!', 'error');
            return;
        }
        
        const lastState = this.history.pop();
        this.grid = lastState.grid;
        this.score = lastState.score;
        
        // Don't restore power-ups count to prevent exploit
        this.powerups.undo--;
        
        this.updateScore();
        this.updatePowerupCounts();
        this.render();
        this.saveGame();
        this.showMessage('Move undone!', 'success');
    }
    
    undoFromGameOver() {
        if (this.history.length === 0) {
            this.showMessage('No moves to undo!', 'error');
            return;
        }
        
        // Close modal first
        this.closeModal();
        
        // Restore last state
        const lastState = this.history.pop();
        this.grid = lastState.grid;
        this.score = lastState.score;
        
        // Clear game over state
        this.gameOver = false;
        
        // Don't charge powerup for undoing from game over
        
        this.updateScore();
        this.updatePowerupCounts();
        this.render();
        this.saveGame();
        this.showMessage('Game resumed!', 'success');
    }
    
    checkForPowerupReward(mergedValue) {
        // Check for theme unlocks
        this.checkThemeUnlock(mergedValue);
        
        // Check achievements
        this.checkAchievements();
        
        // Screen shake for high-value tiles
        if (mergedValue === 2048) {
            this.screenShake(8, 400);
        } else if (mergedValue === 4096) {
            this.screenShake(12, 500);
        } else if (mergedValue >= 8192) {
            this.screenShake(16, 600);
        }
        
        // Award powerups based on tile values created
        let reward = null;
        
        if (mergedValue === 32) {
            this.powerups.swap++;
            reward = { type: 'Swap', icon: '🔄' };
        } else if (mergedValue === 64) {
            this.powerups.lock++;
            reward = { type: 'Lock', icon: '🔒' };
        } else if (mergedValue === 128) {
            this.powerups.undo++;
            reward = { type: 'Undo', icon: '↶' };
        } else if (mergedValue === 256) {
            this.powerups.shuffle++;
            reward = { type: 'Shuffle', icon: '🔀' };
        } else if (mergedValue === 512) {
            this.powerups.remove++;
            reward = { type: 'Remove', icon: '🗑️' };
        } else if (mergedValue === 1024) {
            this.powerups.double++;
            reward = { type: 'Double', icon: '✨' };
        } else if (mergedValue === 2048) {
            // Super reward for 2048!
            this.powerups.undo++;
            this.powerups.shuffle++;
            reward = { type: 'Undo + Shuffle', icon: '🎁' };
        } else if (mergedValue === 4096) {
            // Epic reward for 4096!
            this.powerups.remove++;
            this.powerups.double++;
            reward = { type: 'Remove + Double', icon: '🌟' };
        }
        
        if (reward) {
            this.updatePowerupCounts();
            this.showPowerupReward(reward, mergedValue);
            this.saveGame();
        }
    }
    
    showPowerupReward(reward, tileValue) {
        const message = `${reward.icon} ${tileValue} tile! Earned ${reward.type} powerup!`;
        this.updateGameStatus(message);
        
        // Create floating reward notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '50%';
        notification.style.left = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.background = 'rgba(122, 157, 142, 0.95)';
        notification.style.color = '#f0f0f0';
        notification.style.padding = '20px 40px';
        notification.style.borderRadius = '15px';
        notification.style.fontSize = '1.5em';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '1000';
        notification.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        notification.style.border = '2px solid rgba(122, 157, 142, 0.8)';
        notification.style.animation = 'rewardPop 0.5s ease-out';
        notification.textContent = message;
        
        // Add animation keyframes if not exists
        if (!document.getElementById('reward-animation-style')) {
            const style = document.createElement('style');
            style.id = 'reward-animation-style';
            style.textContent = `
                @keyframes rewardPop {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 2000);
        
        setTimeout(() => {
            this.updateGameStatus('');
        }, 3000);
    }
    
    shuffleTiles() {
        this.saveState();
        
        const tiles = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) {
                    tiles.push(this.grid[r][c]);
                }
            }
        }
        
        // Shuffle array
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        
        // Place back
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
        let tileIndex = 0;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (tileIndex < tiles.length) {
                    this.grid[r][c] = tiles[tileIndex++];
                }
            }
        }
        
        this.powerups.shuffle--;
        this.updatePowerupCounts();
        this.render();
        this.saveGame();
        this.showMessage('Tiles shuffled!', 'success');
    }
    
    removeLowestTile() {
        // Enter selection mode
        this.selectionMode = true;
        this.showSelectionOverlay();
        this.renderWithSelection();
    }
    
    showSelectionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'selection-overlay';
        overlay.id = 'selection-overlay';
        
        const message = document.createElement('div');
        message.className = 'selection-message';
        message.innerHTML = 'Click on any tile to remove it<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
        
        // Click on message to cancel
        message.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelSelection();
        });
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        this.selectionOverlay = overlay;
        
        // Add ESC key listener
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelSelection();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    hideSelectionOverlay() {
        if (this.selectionOverlay) {
            this.selectionOverlay.remove();
            this.selectionOverlay = null;
        }
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }
    
    cancelSelection() {
        this.selectionMode = false;
        this.hideSelectionOverlay();
        this.render();
        this.showMessage('Removal cancelled', 'error');
    }
    
    renderWithSelection() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value + ' selectable';
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.position = 'absolute';
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    tile.style.zIndex = '100';
                    
                    // Add click handler for selection
                    tile.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.removeTileAt(r, c, value);
                    });
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    removeTileAt(row, col, value) {
        this.saveState();
        this.grid[row][col] = 0;
        this.powerups.remove--;
        this.selectionMode = false;
        this.hideSelectionOverlay();
        this.updatePowerupCounts();
        this.render();
        this.saveGame();
        this.showMessage('Removed tile with value ' + value, 'success');
    }
    
    lockTile() {
        if (this.gameOver) return;
        
        let tileCount = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) tileCount++;
            }
        }
        
        if (tileCount === 0) {
            this.showMessage('No tiles to lock!', 'error');
            return;
        }
        
        this.lockMode = true;
        this.selectionMode = true;
        this.powerups.lock--;
        this.updatePowerupCounts();
        this.showLockOverlay();
        this.renderForLock();
    }
    
    showLockOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'selection-overlay';
        overlay.id = 'lock-overlay';
        
        const message = document.createElement('div');
        message.className = 'selection-message';
        message.innerHTML = 'Click a tile to lock for 3 moves<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
        
        message.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelLock();
        });
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        this.selectionOverlay = overlay;
        
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelLock();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    renderForLock() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value + ' selectable';
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.position = 'absolute';
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    tile.style.zIndex = '100';
                    
                    tile.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectLockTile(r, c);
                    });
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    selectLockTile(row, col) {
        // Check if tile is already locked
        const alreadyLocked = this.lockedTiles.some(t => t.row === row && t.col === col);
        if (alreadyLocked) {
            this.showMessage('Tile is already locked!', 'error');
            return;
        }
        
        this.lockedTiles.push({ row, col, movesRemaining: 3 });
        this.lockMode = false;
        this.selectionMode = false;
        this.hideSelectionOverlay();
        this.render();
        this.saveGame();
        this.showMessage('Tile locked for 3 moves! 🔒', 'success');
    }
    
    cancelLock() {
        this.lockMode = false;
        this.selectionMode = false;
        this.hideSelectionOverlay();
        this.powerups.lock++;
        this.updatePowerupCounts();
        this.render();
        this.showMessage('Lock cancelled', 'info');
    }
    
    doubleTile() {
        if (this.gameOver) return;
        
        let tileCount = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) tileCount++;
            }
        }
        
        if (tileCount === 0) {
            this.showMessage('No tiles to double!', 'error');
            return;
        }
        
        this.doubleMode = true;
        this.selectionMode = true;
        this.powerups.double--;
        this.updatePowerupCounts();
        this.showDoubleOverlay();
        this.renderForDouble();
    }
    
    showDoubleOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'selection-overlay';
        overlay.id = 'double-overlay';
        
        const message = document.createElement('div');
        message.className = 'selection-message';
        message.innerHTML = 'Click a tile to double its value<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
        
        message.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelDouble();
        });
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        this.selectionOverlay = overlay;
        
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelDouble();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    renderForDouble() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value + ' selectable';
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.position = 'absolute';
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    tile.style.zIndex = '100';
                    
                    tile.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectDoubleTile(r, c);
                    });
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    selectDoubleTile(row, col) {
        const oldValue = this.grid[row][col];
        const newValue = oldValue * 2;
        this.grid[row][col] = newValue;
        
        // Check for theme unlocks and powerup rewards
        this.checkForPowerupReward(newValue);
        
        // Check for victory if doubled to 2048
        if (newValue === 2048 && !this.won) {
            this.showVictory();
        }
        
        this.doubleMode = false;
        this.selectionMode = false;
        this.hideSelectionOverlay();
        this.render();
        this.saveGame();
        this.showMessage(`Doubled ${oldValue} to ${newValue}! ✨`, 'success');
    }
    
    cancelDouble() {
        this.doubleMode = false;
        this.selectionMode = false;
        this.hideSelectionOverlay();
        this.powerups.double++;
        this.updatePowerupCounts();
        this.render();
        this.showMessage('Double cancelled', 'info');
    }
    
    swapTiles() {
        if (this.gameOver) return;
        
        // Check if there are at least 2 tiles to swap
        let tileCount = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) tileCount++;
            }
        }
        
        if (tileCount < 2) {
            this.showMessage('Need at least 2 tiles to swap!', 'error');
            return;
        }
        
        this.swapMode = true;
        this.selectionMode = true;
        this.firstSwapTile = null;
        this.powerups.swap--;
        this.updatePowerupCounts();
        this.showSwapOverlay();
        this.renderForSwap();
    }
    
    showSwapOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'selection-overlay';
        overlay.id = 'swap-overlay';
        
        const message = document.createElement('div');
        message.className = 'selection-message';
        message.innerHTML = 'Click first tile to swap<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
        
        message.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelSwap();
        });
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        this.selectionOverlay = overlay;
        
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelSwap();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    updateSwapMessage(text) {
        if (this.selectionOverlay) {
            const message = this.selectionOverlay.querySelector('.selection-message');
            if (message) {
                message.innerHTML = text + '<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
            }
        }
    }
    
    renderForSwap() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value + ' selectable';
                    
                    // Highlight first selected tile
                    if (this.firstSwapTile && 
                        this.firstSwapTile.row === r && 
                        this.firstSwapTile.col === c) {
                        tile.style.border = '3px solid #7a9d8e';
                        tile.style.boxShadow = '0 0 20px rgba(122, 157, 142, 0.8)';
                    }
                    
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.position = 'absolute';
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    tile.style.zIndex = '100';
                    
                    tile.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectSwapTile(r, c, value);
                    });
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    selectSwapTile(row, col, value) {
        if (!this.firstSwapTile) {
            // First tile selected
            this.firstSwapTile = { row, col, value };
            this.updateSwapMessage('Click second tile to swap with');
            this.renderForSwap(); // Re-render to highlight selected tile
        } else {
            // Second tile selected - perform swap
            const temp = this.grid[this.firstSwapTile.row][this.firstSwapTile.col];
            this.grid[this.firstSwapTile.row][this.firstSwapTile.col] = this.grid[row][col];
            this.grid[row][col] = temp;
            
            this.swapMode = false;
            this.selectionMode = false;
            this.firstSwapTile = null;
            this.hideSelectionOverlay();
            this.render();
            this.saveGame();
            this.showMessage('Tiles swapped! 🔄', 'success');
        }
    }
    
    cancelSwap() {
        this.swapMode = false;
        this.selectionMode = false;
        this.firstSwapTile = null;
        this.hideSelectionOverlay();
        this.powerups.swap++; // Refund the powerup
        this.updatePowerupCounts();
        this.render();
        this.showMessage('Swap cancelled', 'info');
    }
    
    swapTiles() {
        if (this.gameOver) return;
        
        // Check if there are at least 2 tiles to swap
        let tileCount = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) tileCount++;
            }
        }
        
        if (tileCount < 2) {
            this.showMessage('Need at least 2 tiles to swap!', 'error');
            return;
        }
        
        this.swapMode = true;
        this.selectionMode = true;
        this.firstSwapTile = null;
        this.powerups.swap--;
        this.updatePowerupCounts();
        this.showSwapOverlay();
        this.renderForSwap();
    }
    
    showSwapOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'selection-overlay';
        overlay.id = 'swap-overlay';
        
        const message = document.createElement('div');
        message.className = 'selection-message';
        message.innerHTML = 'Click first tile to swap<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
        
        message.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelSwap();
        });
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        this.selectionOverlay = overlay;
        
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelSwap();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    updateSwapMessage(text) {
        if (this.selectionOverlay) {
            const message = this.selectionOverlay.querySelector('.selection-message');
            if (message) {
                message.innerHTML = text + '<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
            }
        }
    }
    
    renderForSwap() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value + ' selectable';
                    
                    // Highlight first selected tile
                    if (this.firstSwapTile && 
                        this.firstSwapTile.row === r && 
                        this.firstSwapTile.col === c) {
                        tile.style.border = '3px solid #7a9d8e';
                        tile.style.boxShadow = '0 0 20px rgba(122, 157, 142, 0.8)';
                    }
                    
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.position = 'absolute';
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    tile.style.zIndex = '100';
                    
                    tile.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectSwapTile(r, c, value);
                    });
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    selectSwapTile(row, col, value) {
        if (!this.firstSwapTile) {
            // First tile selected
            this.firstSwapTile = { row, col, value };
            this.updateSwapMessage('Click second tile to swap with');
            this.renderForSwap(); // Re-render to highlight selected tile
        } else {
            // Second tile selected - perform swap
            const temp = this.grid[this.firstSwapTile.row][this.firstSwapTile.col];
            this.grid[this.firstSwapTile.row][this.firstSwapTile.col] = this.grid[row][col];
            this.grid[row][col] = temp;
            
            this.swapMode = false;
            this.selectionMode = false;
            this.firstSwapTile = null;
            this.hideSelectionOverlay();
            this.render();
            this.saveGame();
            this.showMessage('Tiles swapped! 🔄', 'success');
        }
    }
    
    cancelSwap() {
        this.swapMode = false;
        this.selectionMode = false;
        this.firstSwapTile = null;
        this.hideSelectionOverlay();
        this.powerups.swap++; // Refund the powerup
        this.updatePowerupCounts();
        this.render();
        this.showMessage('Swap cancelled', 'info');
    }
    
    swapTiles() {
        if (this.gameOver) return;
        
        // Check if there are at least 2 tiles to swap
        let tileCount = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) tileCount++;
            }
        }
        
        if (tileCount < 2) {
            this.showMessage('Need at least 2 tiles to swap!', 'error');
            return;
        }
        
        this.swapMode = true;
        this.selectionMode = true;
        this.firstSwapTile = null;
        this.powerups.swap--;
        this.updatePowerupCounts();
        this.showSwapOverlay();
        this.renderForSwap();
    }
    
    showSwapOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'selection-overlay';
        overlay.id = 'swap-overlay';
        
        const message = document.createElement('div');
        message.className = 'selection-message';
        message.innerHTML = 'Click first tile to swap<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
        
        message.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelSwap();
        });
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);
        this.selectionOverlay = overlay;
        
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelSwap();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }
    
    updateSwapMessage(text) {
        if (this.selectionOverlay) {
            const message = this.selectionOverlay.querySelector('.selection-message');
            if (message) {
                message.innerHTML = text + '<br><small style="font-size: 0.8em; color: #909090;">Press ESC or click here to cancel</small>';
            }
        }
    }
    
    renderForSwap() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value + ' selectable';
                    
                    // Highlight first selected tile
                    if (this.firstSwapTile && 
                        this.firstSwapTile.row === r && 
                        this.firstSwapTile.col === c) {
                        tile.style.border = '3px solid #7a9d8e';
                        tile.style.boxShadow = '0 0 20px rgba(122, 157, 142, 0.8)';
                    }
                    
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.position = 'absolute';
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    tile.style.zIndex = '100';
                    
                    tile.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectSwapTile(r, c, value);
                    });
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    selectSwapTile(row, col, value) {
        if (!this.firstSwapTile) {
            // First tile selected
            this.firstSwapTile = { row, col, value };
            this.updateSwapMessage('Click second tile to swap with');
            this.renderForSwap(); // Re-render to highlight selected tile
        } else {
            // Second tile selected - perform swap
            const temp = this.grid[this.firstSwapTile.row][this.firstSwapTile.col];
            this.grid[this.firstSwapTile.row][this.firstSwapTile.col] = this.grid[row][col];
            this.grid[row][col] = temp;
            
            this.swapMode = false;
            this.selectionMode = false;
            this.firstSwapTile = null;
            this.hideSelectionOverlay();
            this.render();
            this.saveGame();
            this.showMessage('Tiles swapped! 🔄', 'success');
        }
    }
    
    cancelSwap() {
        this.swapMode = false;
        this.selectionMode = false;
        this.firstSwapTile = null;
        this.hideSelectionOverlay();
        this.powerups.swap++; // Refund the powerup
        this.updatePowerupCounts();
        this.render();
        this.showMessage('Swap cancelled', 'info');
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.updateBestScore();
        }
        
        // Check for mega secret (8192+ tiles)
        this.checkMegaSecret();
        
        // Animate score increase
        const scoreAddition = document.getElementById('score-addition');
        if (this.history.length > 0) {
            const lastScore = this.history[this.history.length - 1].score;
            const diff = this.score - lastScore;
            if (diff > 0) {
                scoreAddition.textContent = '+' + diff;
                scoreAddition.classList.remove('show');
                void scoreAddition.offsetWidth; // Trigger reflow
                scoreAddition.classList.add('show');
            }
        }
    }
    
    updateBestScore() {
        document.getElementById('best-score').textContent = this.bestScore;
    }
    
    updatePowerupCounts() {
        for (const [key, value] of Object.entries(this.powerups)) {
            const countEl = document.getElementById(key + '-count');
            const btnEl = document.getElementById(key + '-btn');
            
            // Defensive null checks
            if (countEl) {
                countEl.textContent = value;
            }
            
            if (btnEl) {
                if (value <= 0) {
                    btnEl.classList.add('disabled');
                } else {
                    btnEl.classList.remove('disabled');
                }
            }
        }
    }
    
    updateGameStatus(message) {
        document.getElementById('game-status').textContent = message;
    }
    
    showMessage(message, type) {
        this.updateGameStatus(message);
        setTimeout(() => {
            this.updateGameStatus('');
        }, 2000);
    }
    
    showVictory() {
        this.won = true;
        
        // Victory sound and celebration effects
        this.playVictorySound();
        this.emitConfetti();
        this.screenShake(6, 400);
        
        setTimeout(() => {
            const continueBtn = document.getElementById('modal-continue');
            const undoBtn = document.getElementById('modal-undo');
            if (continueBtn) continueBtn.style.display = 'inline-block';
            if (undoBtn) undoBtn.style.display = 'none';
            this.showModal('🎉 You Win! 🎉', 'You reached 2048! Continue playing to reach higher scores!');
        }, 500);
    }
    
    showGameOver() {
        setTimeout(() => {
            const continueBtn = document.getElementById('modal-continue');
            const undoBtn = document.getElementById('modal-undo');
            if (continueBtn) continueBtn.style.display = 'none';
            if (undoBtn) undoBtn.style.display = 'inline-block';
            this.playGameOverSound();
            this.showModal('Game Over!', 'No more moves available');
        }, 500);
    }
    
    showModal(title, message) {
        const modal = document.getElementById('game-over-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const finalScore = document.getElementById('final-score');
        const newBest = document.getElementById('new-best');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        finalScore.textContent = this.score;
        
        if (this.score >= this.bestScore && this.score > 0) {
            newBest.style.display = 'block';
        } else {
            newBest.style.display = 'none';
        }
        
        modal.classList.add('show');
    }
    
    closeModal() {
        document.getElementById('game-over-modal').classList.remove('show');
    }
    
    render() {
        const container = document.getElementById('tile-container');
        container.innerHTML = '';
        
        const containerWidth = container.offsetWidth;
        const cellSize = (containerWidth - (this.gridSize - 1) * 15) / this.gridSize;
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const value = this.grid[r][c];
                
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = 'tile tile-' + value;
                    tile.textContent = value;
                    
                    const x = c * (cellSize + 15);
                    const y = r * (cellSize + 15);
                    
                    tile.style.width = cellSize + 'px';
                    tile.style.height = cellSize + 'px';
                    tile.style.left = x + 'px';
                    tile.style.top = y + 'px';
                    tile.style.lineHeight = cellSize + 'px';
                    
                    container.appendChild(tile);
                }
            }
        }
    }
    
    // ===== THEME SYSTEM =====
    checkThemeUnlock(tileValue) {
        console.log('Checking theme unlock for tile value:', tileValue);
        for (const [themeKey, theme] of Object.entries(this.themes)) {
            console.log(`Theme ${themeKey}: unlockedAt=${theme.unlockedAt}, unlocked=${theme.unlocked}`);
            if (theme.unlockedAt === tileValue && !theme.unlocked) {
                console.log('✨ Theme unlock condition met for:', themeKey);
                this.unlockTheme(themeKey);
            }
        }
    }

    unlockTheme(themeName) {
        if (!this.themes[themeName]) return;
        
        console.log('🎨 Unlocking theme:', themeName);
        
        this.themes[themeName].unlocked = true;
        this.saveThemeProgress();
        
        // Update theme button UI
        const themeButton = document.querySelector(`[data-theme="${themeName}"]`);
        if (themeButton) {
            themeButton.classList.remove('locked');
            themeButton.classList.add('active');
            const lockIcon = themeButton.querySelector('.lock-icon');
            if (lockIcon) {
                lockIcon.remove(); // Remove the lock icon completely
            }
        }
        
        // Show theme selector if hidden
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector && themeSelector.style.display === 'none') {
            themeSelector.style.display = 'block';
        }
        
        // Show unlock notification
        this.showThemeUnlockNotification(themeName);
        
        // Emit celebration particles and confetti BEFORE switching theme
        this.emitThemeUnlockParticles();
        this.emitConfetti();
        this.screenShake(10, 600);
        
        // Auto-switch to newly unlocked theme
        this.switchTheme(themeName);
    }

    switchTheme(themeName) {
        // Allow switching to default theme always, check unlock for others
        if (themeName !== 'default' && (!this.themes[themeName] || !this.themes[themeName].unlocked)) {
            console.log('Theme not unlocked:', themeName);
            return;
        }
        
        // Remove old theme class
        document.body.classList.remove(`theme-${this.currentTheme}`);
        
        // Add new theme class
        this.currentTheme = themeName;
        if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
        
        // Save preference
        this.saveThemeProgress();
        
        // Update UI selector
        const themeButtons = document.querySelectorAll('.theme-button');
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    showThemeUnlockNotification(themeName) {
        const theme = this.themes[themeName];
        const notification = document.createElement('div');
        notification.className = 'theme-unlock-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">🎨 NEW THEME UNLOCKED!</div>
                <div class="notification-theme-name">${theme.name}</div>
                <div class="notification-description">${theme.description}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    saveThemeProgress() {
        const themeData = {
            currentTheme: this.currentTheme,
            unlockedThemes: Object.entries(this.themes)
                .filter(([key, theme]) => theme.unlocked)
                .map(([key]) => key)
        };
        localStorage.setItem('gameThemes', JSON.stringify(themeData));
    }

    loadThemeProgress() {
        console.log('Loading theme progress...');
        const saved = localStorage.getItem('gameThemes');
        if (saved) {
            try {
                const themeData = JSON.parse(saved);
                console.log('Saved theme data:', themeData);
                
                // Restore unlocked themes
                if (themeData.unlockedThemes) {
                    themeData.unlockedThemes.forEach(themeKey => {
                        if (this.themes[themeKey]) {
                            this.themes[themeKey].unlocked = true;
                            console.log(`Restored theme: ${themeKey}`);
                            
                            // Update button UI
                            const themeButton = document.querySelector(`[data-theme="${themeKey}"]`);
                            if (themeButton) {
                                themeButton.classList.remove('locked');
                                const lockIcon = themeButton.querySelector('.lock-icon');
                                if (lockIcon) {
                                    lockIcon.remove(); // Remove the lock icon completely
                                }
                            }
                        }
                    });
                }
                
                // Restore current theme
                if (themeData.currentTheme && this.themes[themeData.currentTheme]?.unlocked) {
                    console.log('Switching to saved theme:', themeData.currentTheme);
                    this.switchTheme(themeData.currentTheme);
                }
                
                // Show theme selector if any theme is unlocked besides default
                const hasUnlockedThemes = themeData.unlockedThemes.some(key => key !== 'default');
                if (hasUnlockedThemes) {
                    const themeSelector = document.getElementById('theme-selector');
                    if (themeSelector) {
                        themeSelector.style.display = 'block';
                        console.log('Theme selector shown');
                    }
                }
                
            } catch (error) {
                console.error('Error loading theme progress:', error);
            }
        } else {
            console.log('No saved theme data found');
        }
    }
    
    // ===== PARTICLE SYSTEM =====
    
    setupParticleSystem() {
        this.particleSystem = new ParticleSystem();
        console.log('✨ Particle system initialized');
    }
    
    getThemeColors() {
        const themeColorMap = {
            default: ['#7a9d8e', '#8ba898', '#b0b0b0'],
            cyberpunk: ['#ff006e', '#00f5ff', '#bd00ff'],
            vaporwave: ['#ff6ec7', '#b967ff', '#ffb347'],
            matrix: ['#00ff41', '#00ff41', '#00ff41']
        };
        return themeColorMap[this.currentTheme] || themeColorMap.default;
    }
    
    emitMergeParticles(row, col, value) {
        if (!this.particleSystem) return;
        
        const tileContainer = document.getElementById('tile-container');
        const rect = tileContainer.getBoundingClientRect();
        const tileSize = rect.width / this.gridSize;
        const gap = 15;
        
        const x = rect.left + col * (tileSize + gap) + tileSize / 2;
        const y = rect.top + row * (tileSize + gap) + tileSize / 2;
        
        const colors = this.getThemeColors();
        const particleCount = Math.min(8 + Math.floor(Math.log2(value)), 20);
        
        this.particleSystem.emit(x, y, particleCount, {
            colors: colors,
            sizeRange: [3, 8],
            speedRange: [1, 3],
            lifetime: 1000,
            spread: 360
        });
    }
    
    emitThemeUnlockParticles() {
        if (!this.particleSystem) return;
        
        const colors = this.getThemeColors();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Burst effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.particleSystem.emit(centerX, centerY, 50, {
                    colors: colors,
                    sizeRange: [4, 12],
                    speedRange: [2, 6],
                    lifetime: 2000,
                    spread: 360
                });
            }, i * 100);
        }
    }
    
    // ===== SCREEN SHAKE EFFECT =====
    screenShake(intensity = 10, duration = 300) {
        const container = document.querySelector('.container');
        if (!container) return;
        
        const startTime = Date.now();
        const originalTransform = container.style.transform;
        
        const shake = () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed < duration) {
                const progress = elapsed / duration;
                const currentIntensity = intensity * (1 - progress); // Fade out
                
                const x = (Math.random() - 0.5) * currentIntensity * 2;
                const y = (Math.random() - 0.5) * currentIntensity * 2;
                const rotation = (Math.random() - 0.5) * (currentIntensity / 5);
                
                container.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
                requestAnimationFrame(shake);
            } else {
                container.style.transform = originalTransform;
            }
        };
        
        requestAnimationFrame(shake);
    }
    
    // ===== CONFETTI ANIMATION =====
    emitConfetti() {
        if (!this.particleSystem) return;
        
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'];
        const centerX = window.innerWidth / 2;
        const topY = 0;
        
        // Create confetti burst from top
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                for (let j = 0; j < 20; j++) {
                    const offsetX = (Math.random() - 0.5) * window.innerWidth * 0.6;
                    this.particleSystem.emit(centerX + offsetX, topY, 1, {
                        colors: [colors[Math.floor(Math.random() * colors.length)]],
                        sizeRange: [6, 14],
                        speedRange: [2, 5],
                        lifetime: 3000,
                        spread: 180, // Downward spread
                        gravity: 0.2
                    });
                }
            }, i * 150);
        }
    }
}

// ===== PARTICLE CLASSES =====

class Particle {
    constructor(x, y, color, velocity, size, lifetime, gravity = null) {
        this.x = x;
        this.y = y;
        this.vx = velocity.x;
        this.vy = velocity.y;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.age = 0;
        this.opacity = 1;
        this.gravity = gravity !== null ? gravity : 0.15; // Custom or default gravity
    }
    
    update(deltaTime) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; // Apply gravity
        this.age += deltaTime;
        this.opacity = Math.max(0, 1 - (this.age / this.lifetime));
        this.size = Math.max(0, this.size * 0.98); // Shrink
    }
    
    isDead() {
        return this.age >= this.lifetime || this.opacity <= 0 || this.size <= 0.5;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.lastTime = Date.now();
        this.maxParticles = 200;
        
        this.setupCanvas();
        this.startAnimation();
    }
    
    setupCanvas() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particle-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '100'; // Below game UI but above background
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    emit(x, y, count, config = {}) {
        const {
            colors = ['#7a9d8e', '#8ba898', '#b0b0b0'],
            sizeRange = [3, 8],
            speedRange = [1, 3],
            lifetime = 1000,
            spread = 360,
            gravity = null
        } = config;
        
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            
            const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
            const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
            const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };
            
            const particle = new Particle(x, y, color, velocity, size, lifetime, gravity);
            this.particles.push(particle);
        }
    }
    
    startAnimation() {
        const animate = () => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            this.update(deltaTime);
            this.render();
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    update(deltaTime) {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            
            // Remove dead particles
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render all particles
        for (const particle of this.particles) {
            particle.render(this.ctx);
        }
    }
    
    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Achievement System Extension for Game2048
Object.assign(Game2048.prototype, {
    // Load achievements from localStorage
    loadAchievements() {
        const saved = localStorage.getItem('2048_achievements');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Update unlocked status
                for (const id in data.achievements) {
                    if (this.achievements[id]) {
                        this.achievements[id].unlocked = data.achievements[id].unlocked;
                    }
                }
                // Restore lifetime stats
                if (data.lifetimeStats) {
                    this.lifetimeStats = { ...this.lifetimeStats, ...data.lifetimeStats };
                }
            } catch (e) {
                console.error('Failed to load achievements:', e);
            }
        }
        this.updateAchievementUI();
    },
    
    // Save achievements to localStorage
    saveAchievements() {
        const data = {
            achievements: {},
            lifetimeStats: this.lifetimeStats
        };
        
        for (const id in this.achievements) {
            data.achievements[id] = {
                unlocked: this.achievements[id].unlocked
            };
        }
        
        localStorage.setItem('2048_achievements', JSON.stringify(data));
    },
    
    // Check all achievement conditions
    checkAchievements() {
        const maxTile = Math.max(...this.grid.flat());
        
        // Speed Demon: Reach 2048 in under 150 moves
        if (!this.achievements.speedDemon.unlocked && 
            maxTile >= 2048 && 
            this.stats.currentGameMoves < 150) {
            this.unlockAchievement('speedDemon');
        }
        
        // Minimalist: Reach 2048 using ≤5 total powerups
        if (!this.achievements.minimalist.unlocked && 
            maxTile >= 2048 && 
            this.stats.currentGamePowerupsUsed <= 5) {
            this.unlockAchievement('minimalist');
        }
        
        // No Undo: Reach 2048 without using undo
        if (!this.achievements.noUndo.unlocked && 
            maxTile >= 2048 && 
            !this.stats.currentGameUsedUndo) {
            this.unlockAchievement('noUndo');
        }
        
        // Lock Master: Successfully use lock 10 times
        if (!this.achievements.lockMaster.unlocked && 
            this.lifetimeStats.lockUses >= 10) {
            this.unlockAchievement('lockMaster');
        }
        
        // Swap Expert: Use swap 25 times
        if (!this.achievements.swapExpert.unlocked && 
            this.lifetimeStats.swapUses >= 25) {
            this.unlockAchievement('swapExpert');
        }
        
        // Powerup Hoarder: Have 5+ of every powerup simultaneously
        if (!this.achievements.hoarder.unlocked) {
            const hasAllFive = Object.values(this.powerups).every(count => count >= 5);
            if (hasAllFive) {
                this.unlockAchievement('hoarder');
            }
        }
        
        // Perfect Game: Reach 4096 with no tile removals
        if (!this.achievements.perfectGame.unlocked && 
            maxTile >= 4096 && 
            !this.stats.currentGameUsedRemove) {
            this.unlockAchievement('perfectGame');
        }
    },
    
    // Unlock an achievement
    unlockAchievement(id) {
        if (!this.achievements[id] || this.achievements[id].unlocked) return;
        
        this.achievements[id].unlocked = true;
        this.saveAchievements();
        this.showAchievementNotification(this.achievements[id]);
        this.updateAchievementUI();
        
        // Celebration effects
        this.playAchievementSound();
        this.emitConfetti();
        this.screenShake(10, 500);
    },
    
    // Show achievement notification
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },
    
    // Update achievement UI
    updateAchievementUI() {
        const container = document.getElementById('achievements-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const id in this.achievements) {
            const achievement = this.achievements[id];
            const card = document.createElement('div');
            card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            card.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                    ${achievement.unlocked ? '<div class="achievement-status">✓ Unlocked</div>' : '<div class="achievement-status">🔒 Locked</div>'}
                </div>
            `;
            container.appendChild(card);
        }
        
        // Update achievement count
        const unlocked = Object.values(this.achievements).filter(a => a.unlocked).length;
        const total = Object.keys(this.achievements).length;
        const countEl = document.getElementById('achievement-count');
        if (countEl) {
            countEl.textContent = `${unlocked}/${total}`;
        }
    },
    
    // Toggle achievement modal
    toggleAchievements() {
        const modal = document.getElementById('achievements-modal');
        if (!modal) return;
        
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        } else {
            this.updateAchievementUI();
            modal.style.display = 'flex';
        }
    }
});

// Statistics System Extension for Game2048
Object.assign(Game2048.prototype, {
    // Load statistics from localStorage
    loadStatistics() {
        const saved = localStorage.getItem('2048_statistics');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.globalStats = { ...this.globalStats, ...data };
                this.calculateDerivedStats();
            } catch (e) {
                console.error('Failed to load statistics:', e);
            }
        }
    },
    
    // Save statistics to localStorage
    saveStatistics() {
        this.calculateDerivedStats();
        localStorage.setItem('2048_statistics', JSON.stringify(this.globalStats));
    },
    
    // Calculate derived statistics
    calculateDerivedStats() {
        if (this.globalStats.totalGamesPlayed > 0) {
            this.globalStats.averageScore = Math.round(
                this.globalStats.totalScore / this.globalStats.totalGamesPlayed
            );
            this.globalStats.winRate = Math.round(
                (this.globalStats.totalGamesWon / this.globalStats.totalGamesPlayed) * 100
            );
        }
    },
    
    // Update statistics when game ends
    updateGameStatistics(won) {
        // Calculate game duration
        const gameDuration = this.gameStartTime ? Date.now() - this.gameStartTime : 0;
        
        // Update global stats
        this.globalStats.totalGamesPlayed++;
        if (won) {
            this.globalStats.totalGamesWon++;
            
            // Update streak
            this.globalStats.currentStreak++;
            if (this.globalStats.currentStreak > this.globalStats.longestStreak) {
                this.globalStats.longestStreak = this.globalStats.currentStreak;
            }
            
            // Update fastest win (in seconds)
            const durationSeconds = Math.floor(gameDuration / 1000);
            if (durationSeconds < this.globalStats.fastestWin) {
                this.globalStats.fastestWin = durationSeconds;
            }
        } else {
            // Reset streak on loss
            this.globalStats.currentStreak = 0;
        }
        
        // Update cumulative stats
        this.globalStats.totalScore += this.score;
        this.globalStats.totalMoves += this.stats.currentGameMoves;
        this.globalStats.totalPowerupsUsed += this.stats.currentGamePowerupsUsed;
        this.globalStats.totalPlayTime += Math.floor(gameDuration / 1000);
        
        // Update highest tile
        const maxTile = Math.max(...this.grid.flat());
        if (maxTile > this.globalStats.highestTile) {
            this.globalStats.highestTile = maxTile;
        }
        
        // Save to localStorage
        this.saveStatistics();
    },
    
    // Format time duration
    formatDuration(seconds) {
        if (seconds === Infinity) return 'N/A';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },
    
    // Format large numbers with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    // Update statistics UI
    updateStatisticsUI() {
        const stats = this.globalStats;
        
        // Update stat values with animation
        this.animateStatValue('stat-games-played', stats.totalGamesPlayed);
        this.animateStatValue('stat-games-won', stats.totalGamesWon);
        this.animateStatValue('stat-win-rate', stats.winRate, '%');
        this.animateStatValue('stat-total-score', stats.totalScore);
        this.animateStatValue('stat-average-score', stats.averageScore);
        this.animateStatValue('stat-total-moves', stats.totalMoves);
        this.animateStatValue('stat-total-merges', stats.totalTilesMerged);
        this.animateStatValue('stat-total-powerups', stats.totalPowerupsUsed);
        this.animateStatValue('stat-highest-tile', stats.highestTile);
        this.animateStatValue('stat-current-streak', stats.currentStreak);
        this.animateStatValue('stat-longest-streak', stats.longestStreak);
        
        // Update time stats
        const fastestEl = document.getElementById('stat-fastest-win');
        if (fastestEl) {
            fastestEl.textContent = this.formatDuration(stats.fastestWin);
        }
        
        const playTimeEl = document.getElementById('stat-play-time');
        if (playTimeEl) {
            playTimeEl.textContent = this.formatDuration(stats.totalPlayTime);
        }
    },
    
    // Animate stat value counting up
    animateStatValue(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            
            element.textContent = this.formatNumber(currentValue) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = this.formatNumber(targetValue) + suffix;
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    // Toggle statistics modal
    toggleStatistics() {
        const modal = document.getElementById('statistics-modal');
        if (!modal) return;
        
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        } else {
            this.updateStatisticsUI();
            modal.style.display = 'flex';
        }
    },
    
    // Reset statistics (with confirmation)
    resetStatistics() {
        if (!confirm('Are you sure you want to reset all statistics? This cannot be undone!')) {
            return;
        }
        
        this.globalStats = {
            totalGamesPlayed: 0,
            totalGamesWon: 0,
            totalScore: 0,
            totalMoves: 0,
            totalTilesMerged: 0,
            totalPowerupsUsed: 0,
            highestTile: 0,
            fastestWin: Infinity,
            longestStreak: 0,
            currentStreak: 0,
            totalPlayTime: 0,
            averageScore: 0,
            winRate: 0
        };
        
        this.saveStatistics();
        this.updateStatisticsUI();
        this.showMessage('Statistics reset!', 'success');
    }
});

// Grid Size Management Extension for Game2048
Object.assign(Game2048.prototype, {
    // Load grid size preference
    loadGridSize() {
        const saved = localStorage.getItem('2048_gridSize');
        if (saved) {
            const size = parseInt(saved);
            if (this.availableGridSizes.includes(size)) {
                this.gridSize = size;
            }
        }
        this.updateGridSizeUI();
    },
    
    // Save grid size preference
    saveGridSize() {
        localStorage.setItem('2048_gridSize', this.gridSize.toString());
    },
    
    // Change grid size
    changeGridSize(newSize) {
        if (!this.availableGridSizes.includes(newSize)) {
            return;
        }
        
        // Confirm if game is in progress
        if (this.score > 0) {
            const confirmed = confirm(
                `⚠️ Change grid size to ${newSize}x${newSize}?\n\n` +
                `Your current game will be lost!\n\n` +
                `Current Score: ${this.score}`
            );
            if (!confirmed) {
                return;
            }
        }
        
        this.gridSize = newSize;
        this.saveGridSize();
        this.updateGridSizeUI();
        
        // Reinitialize grid with new size
        this.setupGrid();
        this.newGame();
        
        this.showMessage(`Switched to ${newSize}x${newSize} grid!`, 'success');
    },
    
    // Update grid size selector UI
    updateGridSizeUI() {
        const buttons = document.querySelectorAll('.grid-size-btn');
        buttons.forEach(btn => {
            const size = parseInt(btn.dataset.size);
            if (size === this.gridSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update any grid size display
        const display = document.getElementById('current-grid-size');
        if (display) {
            display.textContent = `${this.gridSize}x${this.gridSize}`;
        }
    }
});

// Sound System Extension for Game2048
Object.assign(Game2048.prototype, {
    // Initialize Audio Context
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported', e);
            this.soundEnabled = false;
        }
    },
    
    // Load sound settings
    loadSoundSettings() {
        const saved = localStorage.getItem('2048_soundSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.soundEnabled = settings.enabled !== undefined ? settings.enabled : true;
                this.masterVolume = settings.volume !== undefined ? settings.volume : 0.3;
            } catch (e) {
                console.error('Failed to load sound settings:', e);
            }
        }
        this.updateSoundUI();
    },
    
    // Save sound settings
    saveSoundSettings() {
        const settings = {
            enabled: this.soundEnabled,
            volume: this.masterVolume
        };
        localStorage.setItem('2048_soundSettings', JSON.stringify(settings));
    },
    
    // Play tone with frequency and duration
    playTone(frequency, duration, type = 'sine', volume = 1.0) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            const actualVolume = this.masterVolume * volume;
            gainNode.gain.setValueAtTime(actualVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    },
    
    // Play merge sound (pitch increases with tile value)
    playMergeSound(tileValue) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Calculate frequency based on tile value (logarithmic scale)
        const baseFreq = 200;
        const octaves = Math.log2(tileValue / 2);
        const frequency = baseFreq * Math.pow(2, octaves / 4);
        
        // Higher tiles = longer, deeper sound
        const duration = Math.min(0.15 + octaves * 0.02, 0.4);
        
        this.playTone(frequency, duration, 'sine', 0.4);
        
        // Add harmonic for higher tiles
        if (tileValue >= 128) {
            setTimeout(() => {
                this.playTone(frequency * 1.5, duration * 0.6, 'sine', 0.2);
            }, 30);
        }
    },
    
    // Play powerup sound
    playPowerupSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const powerupSounds = {
            undo: { freq: 523, duration: 0.2, type: 'square' },      // C5
            swap: { freq: 659, duration: 0.15, type: 'triangle' },   // E5
            shuffle: { freq: 784, duration: 0.25, type: 'sine' },    // G5
            remove: { freq: 392, duration: 0.2, type: 'sawtooth' },  // G4
            lock: { freq: 440, duration: 0.3, type: 'sine' },        // A4
            double: { freq: 880, duration: 0.2, type: 'square' }     // A5
        };
        
        const sound = powerupSounds[type];
        if (sound) {
            this.playTone(sound.freq, sound.duration, sound.type, 0.5);
            // Add echo effect
            setTimeout(() => {
                this.playTone(sound.freq * 1.25, sound.duration * 0.5, sound.type, 0.25);
            }, 80);
        }
    },
    
    // Play achievement unlock sound
    playAchievementSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Ascending arpeggio
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'sine', 0.4);
            }, i * 100);
        });
    },
    
    // Play theme unlock sound
    playThemeUnlockSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Magical ascending sweep
        const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.25, 'triangle', 0.5);
            }, i * 80);
        });
    },
    
    // Play victory sound
    playVictorySound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Triumphant fanfare
        const melody = [
            { freq: 523, duration: 0.2 },  // C5
            { freq: 659, duration: 0.2 },  // E5
            { freq: 784, duration: 0.2 },  // G5
            { freq: 1047, duration: 0.4 }  // C6
        ];
        
        melody.forEach((note, i) => {
            setTimeout(() => {
                this.playTone(note.freq, note.duration, 'sine', 0.6);
                // Add harmony
                this.playTone(note.freq * 1.5, note.duration, 'sine', 0.3);
            }, i * 150);
        });
    },
    
    // Play game over sound
    playGameOverSound() {
        if (!this.soundEnabled || !this.audioContext) return;
        
        // Descending sad sound
        const notes = [659, 523, 440, 349]; // E5, C5, A4, F4
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'sawtooth', 0.4);
            }, i * 120);
        });
    },
    
    // Toggle sound on/off
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.saveSoundSettings();
        this.updateSoundUI();
        
        // Play test sound when enabling
        if (this.soundEnabled) {
            this.playTone(440, 0.2, 'sine', 0.5);
        }
        
        this.showMessage(
            this.soundEnabled ? '🔊 Sound Enabled' : '🔇 Sound Disabled',
            'success'
        );
    },
    
    // Set volume
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.saveSoundSettings();
        this.updateSoundUI();
        
        // Play test sound at new volume
        if (this.soundEnabled) {
            this.playTone(440, 0.2, 'sine', 0.5);
        }
    },
    
    // Update sound UI elements
    updateSoundUI() {
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
            soundBtn.title = this.soundEnabled ? 'Sound: ON' : 'Sound: OFF';
        }
        
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.masterVolume * 100;
        }
        
        const volumeValue = document.getElementById('volume-value');
        if (volumeValue) {
            volumeValue.textContent = Math.round(this.masterVolume * 100) + '%';
        }
    },
    
    // Toggle sound settings modal
    toggleSoundSettings() {
        const modal = document.getElementById('sound-settings-modal');
        if (!modal) return;
        
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        } else {
            this.updateSoundUI();
            modal.style.display = 'flex';
        }
    }

    // ==========================================
    // EASTER EGGS & SECRETS SYSTEM
    // ==========================================

    initEasterEggs() {
        // Konami Code listener
        document.addEventListener('keydown', (e) => {
            this.konamiProgress.push(e.key);
            if (this.konamiProgress.length > this.konamiCode.length) {
                this.konamiProgress.shift();
            }
            
            if (JSON.stringify(this.konamiProgress) === JSON.stringify(this.konamiCode)) {
                this.activateKonamiCode();
                this.konamiProgress = [];
            }
        });

        // Dev Console toggle (~ or ` key)
        document.addEventListener('keydown', (e) => {
            if (e.key === '~' || e.key === '`') {
                e.preventDefault();
                this.toggleDevConsole();
            }
        });

        // Load secrets from localStorage
        const saved = localStorage.getItem('2048-secrets');
        if (saved) {
            this.secretsUnlocked = JSON.parse(saved);
        }
    }

    showConsoleArt() {
        console.log(`
%c╔═══════════════════════════════════════╗
║                                       ║
║        🎮  2048 DELUXE  🎮           ║
║                                       ║
║   The Ultimate 2048 Experience        ║
║                                       ║
║   💎 6 Powerups                       ║
║   🎨 4 Themes                         ║
║   🏆 8 Achievements                   ║
║   🔊 Dynamic Sounds                   ║
║   🎪 Secret Easter Eggs               ║
║                                       ║
║   Hint: Try the Konami Code... 🎮     ║
║   Hint: Press ~ for dev tools... 🛠️   ║
║                                       ║
╚═══════════════════════════════════════╝
`, 'color: #4a90e2; font-weight: bold; font-size: 12px;');

        const tips = [
            '💡 Tip: Use powerups wisely - they\'re your secret weapon!',
            '💡 Tip: Unlock themes by reaching high scores!',
            '💡 Tip: Try the 5x5 grid for an extra challenge!',
            '💡 Tip: Check your statistics to track your progress!',
            '💡 Tip: There are hidden secrets waiting to be discovered...'
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        console.log(`%c${randomTip}`, 'color: #f5a623; font-style: italic;');
    }

    activateKonamiCode() {
        if (this.secretsUnlocked.konami) {
            this.showMessage('🎮 Konami Code already used! Try dev console (~) instead!');
            return;
        }

        this.secretsUnlocked.konami = true;
        this.saveSecrets();

        // Grant 5 random powerups
        const types = ['undo', 'swap', 'lock', 'shuffle', 'remove', 'double'];
        const granted = [];
        
        for (let i = 0; i < 5; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerups[type]++;
            granted.push(type);
        }

        // Special rainbow animation
        document.body.style.animation = 'rainbow 2s ease-in-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 2000);

        // Play special sound sequence
        if (this.soundEnabled && this.audioContext) {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 150, 'square', 0.3);
                }, i * 150);
            });
        }

        this.showMessage(`🎮 KONAMI CODE ACTIVATED!\n🎁 Granted 5 random powerups!\n✨ ${granted.join(', ')}`);
        console.log('%c🎮 KONAMI CODE ACTIVATED! 🎮', 'color: #ff6b6b; font-size: 20px; font-weight: bold;');
        
        this.updatePowerupUI();
        this.checkSecretHunterAchievement();
    }

    toggleDevConsole() {
        this.devConsoleEnabled = !this.devConsoleEnabled;
        const consoleEl = document.getElementById('dev-console');
        
        if (this.devConsoleEnabled) {
            if (!this.secretsUnlocked.devConsole) {
                this.secretsUnlocked.devConsole = true;
                this.saveSecrets();
                console.log('%c🛠️ DEV CONSOLE UNLOCKED! 🛠️', 'color: #4ecdc4; font-size: 16px; font-weight: bold;');
                this.checkSecretHunterAchievement();
            }
            consoleEl.classList.add('active');
        } else {
            consoleEl.classList.remove('active');
        }
    }

    // Dev Console Actions
    devAddPowerup(type) {
        if (this.powerups.hasOwnProperty(type)) {
            this.powerups[type] += 5;
            this.updatePowerupUI();
            this.showMessage(`🛠️ Added 5x ${type} powerups`);
        }
    }

    devSetGridSize(size) {
        this.gridSize = size;
        this.resetGame();
        this.showMessage(`🛠️ Grid size changed to ${size}x${size}`);
    }

    devUnlockTheme(theme) {
        this.unlockedThemes.add(theme);
        this.updateThemeUI();
        this.showMessage(`🛠️ Unlocked ${theme} theme`);
    }

    devUnlockAllAchievements() {
        Object.keys(this.achievements).forEach(key => {
            if (!this.achievements[key].unlocked) {
                this.achievements[key].unlocked = true;
            }
        });
        this.saveAchievements();
        this.updateAchievementUI();
        this.showMessage('🛠️ Unlocked all achievements!');
    }

    devSpawnTile(value) {
        const emptyCells = [];
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[row][col] = value;
            this.updateGrid();
            this.showMessage(`🛠️ Spawned ${value} tile`);
        }
    }

    checkSecretHunterAchievement() {
        const secretsFound = Object.values(this.secretsUnlocked).filter(v => v === true).length;
        
        if (secretsFound >= 3 && !this.achievements.secretHunter.unlocked) {
            this.unlockAchievement('secretHunter');
            
            // Epic celebration for finding all secrets!
            this.createConfetti();
            if (this.soundEnabled && this.audioContext) {
                // Play a special celebratory tune
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4-C6 scale
                notes.forEach((freq, i) => {
                    setTimeout(() => {
                        this.playTone(freq, 200, 'sine', 0.4);
                        if (i < notes.length - 1) {
                            setTimeout(() => this.playTone(freq * 1.5, 100, 'triangle', 0.2), 50);
                        }
                    }, i * 150);
                });
            }
        }
    }

    checkMegaSecret() {
        // Check for 8192 or higher tiles
        let hasMegaTile = false;
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.grid[row][col] >= 8192) {
                    hasMegaTile = true;
                    break;
                }
            }
            if (hasMegaTile) break;
        }

        if (hasMegaTile && !this.secretsUnlocked.mega) {
            this.secretsUnlocked.mega = true;
            this.saveSecrets();
            this.showMessage('🌟 MEGA SECRET UNLOCKED!\n✨ You\'ve reached legendary status!');
            console.log('%c🌟 MEGA TILE MASTER! 🌟', 'color: #ffd700; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);');
            this.checkSecretHunterAchievement();
            
            // Add epic golden glow animation to mega tiles
            const tiles = document.querySelectorAll('.tile');
            tiles.forEach(tile => {
                const value = parseInt(tile.dataset.value);
                if (value >= 8192) {
                    tile.style.animation = 'megaGlow 2s ease-in-out infinite';
                }
            });
        }
    }

    saveSecrets() {
        localStorage.setItem('2048-secrets', JSON.stringify(this.secretsUnlocked));
    }
});

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});

