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
        
        this.init();
    }
    
    init() {
        this.loadThemeProgress();
        this.setupGrid();
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
        
        this.updateScore();
        this.updatePowerupCounts();
        this.updateGameStatus('');
        
        // Add initial tiles
        this.addRandomTile();
        this.addRandomTile();
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
            
            for (let i = 0; i < row.length; i++) {
                if (i < row.length - 1 && row[i] === row[i + 1]) {
                    const newValue = row[i] * 2;
                    merged.push(newValue);
                    this.score += newValue;
                    this.checkForPowerupReward(newValue);
                    i++;
                    
                    if (newValue === 2048 && !this.won) {
                        this.showVictory();
                    }
                } else {
                    merged.push(row[i]);
                }
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
            for (let i = 0; i < col.length; i++) {
                if (i < col.length - 1 && col[i] === col[i + 1]) {
                    const newValue = col[i] * 2;
                    merged.push(newValue);
                    this.score += newValue;
                    this.checkForPowerupReward(newValue);
                    i++;
                    
                    if (newValue === 2048 && !this.won) {
                        this.showVictory();
                    }
                } else {
                    merged.push(col[i]);
                }
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
                    this.checkForPowerupReward(newValue);
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
            this.powerups.boost++;
            reward = { type: 'Remove + Boost', icon: '🌟' };
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
            themeButton.classList.add('active');
            const lockIcon = themeButton.querySelector('.theme-lock');
            if (lockIcon) {
                lockIcon.style.display = 'none';
            }
        }
        
        // Show theme selector if hidden
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector && themeSelector.style.display === 'none') {
            themeSelector.style.display = 'block';
        }
        
        // Show unlock notification
        this.showThemeUnlockNotification(themeName);
        
        // Auto-switch to newly unlocked theme
        this.switchTheme(themeName);
    }

    switchTheme(themeName) {
        if (!this.themes[themeName] || !this.themes[themeName].unlocked) {
            console.log('Theme not unlocked:', themeName);
            return;
        }
        
        // Remove old theme class
        document.body.classList.remove(`theme-${this.currentTheme}`);
        
        // Add new theme class
        this.currentTheme = themeName;
        document.body.classList.add(`theme-${themeName}`);
        
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
                                const lockIcon = themeButton.querySelector('.theme-lock');
                                if (lockIcon) {
                                    lockIcon.style.display = 'none';
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
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game2048();
});
