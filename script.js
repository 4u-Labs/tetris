/**
 * TETRIS ARCADE 2026 - 4U.IA.BR
 * Full-featured modern Tetris engine with 7-Bag randomizer, SRS wall kicks,
 * ghost piece, hold queue, particle effects, Web Audio SFX, SQLite highscores,
 * and mobile virtual gamepad.
 */

(function () {
    'use strict';

    // ==========================================
    // 1. CONSTANTS & CONFIGURATION
    // ==========================================
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 24; // 10 * 24 = 240px wide, 20 * 24 = 480px high
    const MINI_BLOCK_SIZE = 16;

    const COLORS = {
        I: { main: '#00dfd8', shadow: '#009e99', glow: 'rgba(0, 223, 216, 0.4)' },
        J: { main: '#007cf0', shadow: '#00519e', glow: 'rgba(0, 124, 240, 0.4)' },
        L: { main: '#ff8000', shadow: '#b35a00', glow: 'rgba(255, 128, 0, 0.4)' },
        O: { main: '#f5a623', shadow: '#b37410', glow: 'rgba(245, 166, 35, 0.4)' },
        S: { main: '#50fa7b', shadow: '#28a745', glow: 'rgba(80, 250, 123, 0.4)' },
        T: { main: '#bd93f9', shadow: '#7928ca', glow: 'rgba(189, 147, 249, 0.4)' },
        Z: { main: '#ff0080', shadow: '#b30059', glow: 'rgba(255, 0, 128, 0.4)' },
        GHOST: 'rgba(255, 255, 255, 0.18)',
        GRID: 'rgba(255, 255, 255, 0.035)'
    };

    const SHAPES = {
        I: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        J: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        L: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        O: [
            [1, 1],
            [1, 1]
        ],
        S: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        T: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        Z: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    };

    const PIECES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

    // Standard SRS Wall Kick tables
    const KICKS_NORMAL = {
        '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
    };

    const KICKS_I = {
        '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
    };

    // ==========================================
    // 2. AUDIO SYNTHESIZER & MUSIC CONTROLLER
    // ==========================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            // Mode: 0 = All (Music + SFX), 1 = SFX only, 2 = Muted
            this.mode = parseInt(localStorage.getItem('tetris_audio_mode') ?? '0', 10);
            this.music = null;
            this.initMusic();
        }

        initContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        initMusic() {
            try {
                this.music = new Audio('assets/sound/tetris_soundtrack.mp3?_t=' + Date.now());
                this.music.loop = true;
                this.music.volume = 0.35;
            } catch (e) {
                console.warn('Audio soundtrack loading deferred:', e);
            }
        }

        startMusic() {
            if (this.mode === 0 && this.music) {
                this.music.play().catch(() => {});
            }
        }

        pauseMusic() {
            if (this.music) {
                this.music.pause();
            }
        }

        toggleMode() {
            this.mode = (this.mode + 1) % 3;
            localStorage.setItem('tetris_audio_mode', this.mode);

            if (this.mode === 0) {
                this.startMusic();
            } else {
                this.pauseMusic();
            }
            return this.getModeInfo();
        }

        getModeInfo() {
            switch (this.mode) {
                case 0: return { icon: '🔊', label: 'Som & Música' };
                case 1: return { icon: '🎵', label: 'Apenas Efeitos' };
                default: return { icon: '🔇', label: 'Mudo' };
            }
        }

        playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.15) {
            if (this.mode === 2) return;
            this.initContext();
            if (!this.ctx) return;

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {}
        }

        playMove() {
            this.playTone(260, 'triangle', 0.05, 0.1);
        }

        playRotate() {
            this.playTone(440, 'sine', 0.07, 0.12);
        }

        playDrop() {
            this.playTone(140, 'square', 0.09, 0.15);
        }

        playHardDrop() {
            this.playTone(90, 'triangle', 0.14, 0.25);
        }

        playHold() {
            this.playTone(520, 'sine', 0.08, 0.12);
        }

        playClear(lineCount) {
            if (this.mode === 2) return;
            this.initContext();
            if (!this.ctx) return;

            const chords = [
                [523.25, 659.25],                   // 1 line: C5, E5
                [523.25, 659.25, 783.99],          // 2 lines: C5, E5, G5
                [523.25, 659.25, 783.99, 1046.50], // 3 lines: C5, E5, G5, C6
                [523.25, 659.25, 783.99, 1046.50, 1318.51] // 4 lines (Tetris!): Fanfare
            ];
            const notes = chords[Math.min(lineCount - 1, 3)];

            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'triangle', 0.18, 0.18);
                }, idx * 60);
            });
        }

        playGameOver() {
            if (this.mode === 2) return;
            const notes = [380, 320, 260, 200, 150];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'sawtooth', 0.15, 0.2);
                }, idx * 100);
            });
        }
    }

    // ==========================================
    // 3. 7-BAG RANDOMIZER
    // ==========================================
    class BagRandomizer {
        constructor() {
            this.bag = [];
        }

        next() {
            if (this.bag.length === 0) {
                this.bag = [...PIECES];
                // Fisher-Yates shuffle
                for (let i = this.bag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
                }
            }
            return this.bag.pop();
        }
    }

    // ==========================================
    // 4. PARTICLE SYSTEM (Canvas Effects)
    // ==========================================
    class ParticleSystem {
        constructor() {
            this.particles = [];
        }

        spawnLineParticles(row, color) {
            const y = row * BLOCK_SIZE + BLOCK_SIZE / 2;
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    x: Math.random() * (COLS * BLOCK_SIZE),
                    y: y + (Math.random() * 8 - 4),
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.7) * 4,
                    size: Math.random() * 4 + 2,
                    color: color,
                    alpha: 1,
                    decay: Math.random() * 0.03 + 0.02
                });
            }
        }

        updateAndDraw(ctx) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // Gravity
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // ==========================================
    // 5. CORE GAME ENGINE
    // ==========================================
    class TetrisGame {
        constructor() {
            this.initElements();
            this.sound = new SoundEngine();
            this.bag = new BagRandomizer();
            this.particles = new ParticleSystem();

            this.grid = this.createGrid();
            this.currentPiece = null;
            this.nextPieceType = null;
            this.holdPieceType = null;
            this.canHold = true;

            this.score = 0;
            this.lines = 0;
            this.level = 1;
            this.highScore = parseInt(localStorage.getItem('tetris_highscore') ?? '0', 10);
            this.highScoreDisplay.textContent = this.formatNumber(this.highScore);

            this.dropCounter = 0;
            this.dropInterval = 800; // ms
            this.lastTime = 0;
            this.paused = false;
            this.gameOver = false;

            this.initListeners();
            this.updateAudioButton();
            this.resetGame();
            this.fetchLeaderboard();
        }

        initElements() {
            this.canvas = document.getElementById('tetrisCanvas');
            this.ctx = this.canvas.getContext('2d');

            this.nextCanvas = document.getElementById('nextCanvas');
            this.nextCtx = this.nextCanvas.getContext('2d');

            this.holdCanvas = document.getElementById('holdCanvas');
            this.holdCtx = this.holdCanvas.getContext('2d');

            this.scoreDisplay = document.getElementById('scoreDisplay');
            this.levelDisplay = document.getElementById('levelDisplay');
            this.linesDisplay = document.getElementById('linesDisplay');
            this.highScoreDisplay = document.getElementById('highScoreDisplay');

            this.boardContainer = document.getElementById('boardContainer');
            this.toastBanner = document.getElementById('toastBanner');
            this.pauseOverlay = document.getElementById('pauseOverlay');
            this.gameOverOverlay = document.getElementById('gameOverOverlay');
            this.gameOverFinalScore = document.getElementById('gameOverFinalScore');
            this.scoreSubmitForm = document.getElementById('scoreSubmitForm');
            this.playerNameInput = document.getElementById('playerNameInput');

            this.btnAudio = document.getElementById('btnAudio');
            this.audioIcon = document.getElementById('audioIcon');
            this.btnPause = document.getElementById('btnPause');
            this.btnResume = document.getElementById('btnResume');
            this.btnRestartFromPause = document.getElementById('btnRestartFromPause');
            this.btnPlayAgain = document.getElementById('btnPlayAgain');

            this.btnLeaderboard = document.getElementById('btnLeaderboard');
            this.leaderboardModal = document.getElementById('leaderboardModal');
            this.btnCloseModal = document.getElementById('btnCloseModal');
            this.btnModalPlay = document.getElementById('btnModalPlay');
            this.leaderboardBody = document.getElementById('leaderboardBody');

            // Mobile Touch buttons
            this.tLeft = document.getElementById('tLeft');
            this.tRight = document.getElementById('tRight');
            this.tDown = document.getElementById('tDown');
            this.tRotate = document.getElementById('tRotate');
            this.tHardDrop = document.getElementById('tHardDrop');
            this.tHold = document.getElementById('tHold');
        }

        createGrid() {
            return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        }

        formatNumber(num) {
            return new Intl.NumberFormat('pt-BR').format(num);
        }

        resetGame() {
            this.grid = this.createGrid();
            this.score = 0;
            this.lines = 0;
            this.level = 1;
            this.dropInterval = 800;
            this.dropCounter = 0;
            this.paused = false;
            this.gameOver = false;
            this.holdPieceType = null;
            this.canHold = true;

            this.pauseOverlay.classList.remove('active');
            this.gameOverOverlay.classList.remove('active');

            this.updateStats();
            this.nextPieceType = this.bag.next();
            this.spawnPiece();
            this.drawMiniPiece(this.holdCtx, this.holdPieceType);

            if (this.sound.mode === 0) {
                this.sound.startMusic();
            }
        }

        spawnPiece() {
            const type = this.nextPieceType;
            this.nextPieceType = this.bag.next();
            this.drawMiniPiece(this.nextCtx, this.nextPieceType);

            const matrix = SHAPES[type].map(row => [...row]);
            this.currentPiece = {
                type: type,
                matrix: matrix,
                x: Math.floor((COLS - matrix[0].length) / 2),
                y: 0,
                rotation: 0
            };

            this.canHold = true;

            // Check if blocked on spawn = Game Over
            if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
                this.triggerGameOver();
            }
        }

        checkCollision(x, y, matrix) {
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c]) {
                        const boardX = x + c;
                        const boardY = y + r;

                        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                            return true;
                        }
                        if (boardY >= 0 && this.grid[boardY][boardX] !== 0) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        getGhostPosition() {
            if (!this.currentPiece) return null;
            let ghostY = this.currentPiece.y;
            while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.matrix)) {
                ghostY++;
            }
            return { x: this.currentPiece.x, y: ghostY };
        }

        rotateMatrix(matrix, dir = 1) {
            const N = matrix.length;
            const result = matrix.map((row, i) =>
                row.map((val, j) => (dir === 1 ? matrix[N - 1 - j][i] : matrix[j][N - 1 - i]))
            );
            return result;
        }

        rotate(dir = 1) {
            if (!this.currentPiece || this.paused || this.gameOver) return;

            const p = this.currentPiece;
            if (p.type === 'O') return; // O does not rotate

            const newMatrix = this.rotateMatrix(p.matrix, dir);
            const oldRot = p.rotation;
            const newRot = (oldRot + dir + 4) % 4;
            const kickKey = `${oldRot}->${newRot}`;

            const kickTable = p.type === 'I' ? KICKS_I[kickKey] : KICKS_NORMAL[kickKey];
            const tests = kickTable || [[0, 0]];

            for (const [kx, ky] of tests) {
                // In Tetris SRS, positive ky is upward, so we subtract ky
                const testX = p.x + kx;
                const testY = p.y - ky;

                if (!this.checkCollision(testX, testY, newMatrix)) {
                    p.x = testX;
                    p.y = testY;
                    p.matrix = newMatrix;
                    p.rotation = newRot;
                    this.sound.playRotate();
                    this.vibrate(10);
                    return;
                }
            }
        }

        move(dir) {
            if (!this.currentPiece || this.paused || this.gameOver) return;
            if (!this.checkCollision(this.currentPiece.x + dir, this.currentPiece.y, this.currentPiece.matrix)) {
                this.currentPiece.x += dir;
                this.sound.playMove();
                this.vibrate(10);
            }
        }

        softDrop() {
            if (!this.currentPiece || this.paused || this.gameOver) return;
            if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
                this.currentPiece.y++;
                this.score += 1;
                this.updateStats();
                this.dropCounter = 0;
            } else {
                this.lockPiece();
            }
        }

        hardDrop() {
            if (!this.currentPiece || this.paused || this.gameOver) return;
            const ghost = this.getGhostPosition();
            if (!ghost) return;

            const dropDistance = ghost.y - this.currentPiece.y;
            this.currentPiece.y = ghost.y;
            this.score += dropDistance * 2;
            this.updateStats();

            this.sound.playHardDrop();
            this.triggerScreenShake();
            this.vibrate(25);
            this.lockPiece();
        }

        hold() {
            if (!this.currentPiece || !this.canHold || this.paused || this.gameOver) return;

            this.sound.playHold();
            this.vibrate(15);
            const currentType = this.currentPiece.type;

            if (this.holdPieceType === null) {
                this.holdPieceType = currentType;
                this.spawnPiece();
            } else {
                const swapType = this.holdPieceType;
                this.holdPieceType = currentType;
                const matrix = SHAPES[swapType].map(row => [...row]);
                this.currentPiece = {
                    type: swapType,
                    matrix: matrix,
                    x: Math.floor((COLS - matrix[0].length) / 2),
                    y: 0,
                    rotation: 0
                };
            }

            this.canHold = false;
            this.drawMiniPiece(this.holdCtx, this.holdPieceType);
        }

        lockPiece() {
            const p = this.currentPiece;
            for (let r = 0; r < p.matrix.length; r++) {
                for (let c = 0; c < p.matrix[r].length; c++) {
                    if (p.matrix[r][c]) {
                        const by = p.y + r;
                        const bx = p.x + c;
                        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                            this.grid[by][bx] = p.type;
                        }
                    }
                }
            }

            this.sound.playDrop();
            this.clearLines();
            this.spawnPiece();
        }

        clearLines() {
            let cleared = 0;

            for (let r = ROWS - 1; r >= 0; r--) {
                const isFull = this.grid[r].every(cell => cell !== 0);
                if (isFull) {
                    cleared++;
                    // Spawn particles before line is removed
                    const sampleColor = COLORS[this.grid[r].find(c => c !== 0) || 'I'].main;
                    this.particles.spawnLineParticles(r, sampleColor);

                    this.grid.splice(r, 1);
                    this.grid.unshift(Array(COLS).fill(0));
                    r++; // Recheck same row index after shift
                }
            }

            if (cleared > 0) {
                const pointsTable = [0, 100, 300, 500, 1000];
                this.score += (pointsTable[cleared] || 100) * this.level;
                this.lines += cleared;

                const newLevel = Math.floor(this.lines / 10) + 1;
                if (newLevel > this.level) {
                    this.level = newLevel;
                    this.dropInterval = Math.max(90, 800 - (this.level - 1) * 70);
                    this.showToast(`NÍVEL ${this.level}!`);
                }

                if (cleared === 4) {
                    this.showToast('TETRIS!');
                    this.triggerScreenShake();
                }

                this.sound.playClear(cleared);
                this.updateStats();
            }
        }

        updateStats() {
            this.scoreDisplay.textContent = this.formatNumber(this.score);
            this.levelDisplay.textContent = this.level;
            this.linesDisplay.textContent = this.lines;

            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.highScoreDisplay.textContent = this.formatNumber(this.highScore);
                localStorage.setItem('tetris_highscore', this.highScore);
            }
        }

        showToast(text) {
            this.toastBanner.textContent = text;
            this.toastBanner.classList.add('show');
            setTimeout(() => {
                this.toastBanner.classList.remove('show');
            }, 1200);
        }

        triggerScreenShake() {
            this.boardContainer.classList.remove('shake');
            void this.boardContainer.offsetWidth; // Trigger reflow
            this.boardContainer.classList.add('shake');
            setTimeout(() => this.boardContainer.classList.remove('shake'), 250);
        }

        vibrate(ms) {
            if (navigator.vibrate) {
                try { navigator.vibrate(ms); } catch (e) {}
            }
        }

        togglePause() {
            if (this.gameOver) return;
            this.paused = !this.paused;
            if (this.paused) {
                this.pauseOverlay.classList.add('active');
                this.sound.pauseMusic();
            } else {
                this.pauseOverlay.classList.remove('active');
                if (this.sound.mode === 0) this.sound.startMusic();
                this.lastTime = performance.now();
            }
        }

        triggerGameOver() {
            this.gameOver = true;
            this.sound.pauseMusic();
            this.sound.playGameOver();
            this.vibrate([100, 50, 150]);

            this.gameOverFinalScore.textContent = `Pontuação Final: ${this.formatNumber(this.score)}`;
            this.gameOverOverlay.classList.add('active');

            // Pre-fill player name if saved
            const savedName = localStorage.getItem('tetris_player_name') || '';
            if (savedName) this.playerNameInput.value = savedName;
            this.playerNameInput.focus();
        }

        // ==========================================
        // 6. DRAWING METHODS
        // ==========================================
        drawBlock(ctx, x, y, type, size = BLOCK_SIZE, isGhost = false) {
            const color = COLORS[type];
            if (!color) return;

            const px = x * size;
            const py = y * size;

            if (isGhost) {
                ctx.fillStyle = COLORS.GHOST;
                ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
                ctx.strokeStyle = color.main;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
                return;
            }

            // Outer fill with subtle gradient
            const grad = ctx.createLinearGradient(px, py, px + size, py + size);
            grad.addColorStop(0, color.main);
            grad.addColorStop(1, color.shadow);
            ctx.fillStyle = grad;
            ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

            // Bevel highlights (top & left)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(px + 2, py + 2, size - 4, 2);
            ctx.fillRect(px + 2, py + 2, 2, size - 4);

            // Dark bevel edge (bottom & right)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(px + 2, py + size - 4, size - 4, 2);
            ctx.fillRect(px + size - 4, py + 2, 2, size - 4);

            // Border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
        }

        drawMiniPiece(ctx, type) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            if (!type) return;

            const matrix = SHAPES[type];
            const size = MINI_BLOCK_SIZE;
            const w = matrix[0].length * size;
            const h = matrix.length * size;
            const offsetX = Math.floor((ctx.canvas.width - w) / 2);
            const offsetY = Math.floor((ctx.canvas.height - h) / 2);

            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c]) {
                        const px = offsetX + c * size;
                        const py = offsetY + r * size;
                        const col = COLORS[type];

                        ctx.fillStyle = col.main;
                        ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.fillRect(px + 1, py + 1, size - 2, 2);
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
                    }
                }
            }
        }

        draw() {
            // Clear board
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Subtle Grid lines
            this.ctx.strokeStyle = COLORS.GRID;
            this.ctx.lineWidth = 1;
            for (let c = 1; c < COLS; c++) {
                this.ctx.beginPath();
                this.ctx.moveTo(c * BLOCK_SIZE + 0.5, 0);
                this.ctx.lineTo(c * BLOCK_SIZE + 0.5, ROWS * BLOCK_SIZE);
                this.ctx.stroke();
            }
            for (let r = 1; r < ROWS; r++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, r * BLOCK_SIZE + 0.5);
                this.ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE + 0.5);
                this.ctx.stroke();
            }

            // Draw locked blocks
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (this.grid[r][c] !== 0) {
                        this.drawBlock(this.ctx, c, r, this.grid[r][c]);
                    }
                }
            }

            // Draw Ghost Piece
            if (this.currentPiece && !this.gameOver) {
                const ghost = this.getGhostPosition();
                if (ghost) {
                    for (let r = 0; r < this.currentPiece.matrix.length; r++) {
                        for (let c = 0; c < this.currentPiece.matrix[r].length; c++) {
                            if (this.currentPiece.matrix[r][c]) {
                                this.drawBlock(
                                    this.ctx,
                                    ghost.x + c,
                                    ghost.y + r,
                                    this.currentPiece.type,
                                    BLOCK_SIZE,
                                    true
                                );
                            }
                        }
                    }
                }

                // Draw Active Piece
                for (let r = 0; r < this.currentPiece.matrix.length; r++) {
                    for (let c = 0; c < this.currentPiece.matrix[r].length; c++) {
                        if (this.currentPiece.matrix[r][c]) {
                            this.drawBlock(
                                this.ctx,
                                this.currentPiece.x + c,
                                this.currentPiece.y + r,
                                this.currentPiece.type
                            );
                        }
                    }
                }
            }

            // Update & Render particle explosions
            this.particles.updateAndDraw(this.ctx);
        }

        // ==========================================
        // 7. GAME LOOP
        // ==========================================
        update(time = 0) {
            const deltaTime = time - this.lastTime;
            this.lastTime = time;

            if (!this.paused && !this.gameOver) {
                this.dropCounter += deltaTime;
                if (this.dropCounter > this.dropInterval) {
                    if (this.currentPiece) {
                        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
                            this.currentPiece.y++;
                        } else {
                            this.lockPiece();
                        }
                    }
                    this.dropCounter = 0;
                }
            }

            this.draw();
            requestAnimationFrame(t => this.update(t));
        }

        // ==========================================
        // 8. INPUT HANDLING & EVENT LISTENERS
        // ==========================================
        initListeners() {
            // Keyboard Controls
            window.addEventListener('keydown', e => {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                    e.preventDefault(); // Prevent window scroll
                }

                switch (e.key) {
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        this.move(-1);
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        this.move(1);
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        this.softDrop();
                        break;
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                    case 'x':
                    case 'X':
                        this.rotate(1);
                        break;
                    case 'z':
                    case 'Z':
                        this.rotate(-1);
                        break;
                    case ' ':
                        this.hardDrop();
                        break;
                    case 'c':
                    case 'C':
                    case 'Shift':
                        this.hold();
                        break;
                    case 'p':
                    case 'P':
                    case 'Escape':
                        this.togglePause();
                        break;
                    case 'm':
                    case 'M':
                        this.toggleAudio();
                        break;
                }
            });

            // Touch / Mobile Virtual Gamepad
            const bindBtn = (elem, action) => {
                if (!elem) return;
                let repeatTimer = null;
                const start = e => {
                    e.preventDefault();
                    elem.classList.add('pressed');
                    action();
                    repeatTimer = setInterval(action, 110);
                };
                const stop = e => {
                    if (e) e.preventDefault();
                    elem.classList.remove('pressed');
                    if (repeatTimer) {
                        clearInterval(repeatTimer);
                        repeatTimer = null;
                    }
                };

                elem.addEventListener('touchstart', start, { passive: false });
                elem.addEventListener('touchend', stop, { passive: false });
                elem.addEventListener('touchcancel', stop, { passive: false });
                elem.addEventListener('mousedown', start);
                elem.addEventListener('mouseup', stop);
                elem.addEventListener('mouseleave', stop);
            };

            const bindSingleTap = (elem, action) => {
                if (!elem) return;
                const tap = e => {
                    e.preventDefault();
                    elem.classList.add('pressed');
                    action();
                    setTimeout(() => elem.classList.remove('pressed'), 120);
                };
                elem.addEventListener('touchstart', tap, { passive: false });
                elem.addEventListener('mousedown', tap);
            };

            bindBtn(this.tLeft, () => this.move(-1));
            bindBtn(this.tRight, () => this.move(1));
            bindBtn(this.tDown, () => this.softDrop());
            bindSingleTap(this.tRotate, () => this.rotate(1));
            bindSingleTap(this.tHardDrop, () => this.hardDrop());
            bindSingleTap(this.tHold, () => this.hold());

            // Canvas touch gestures (swipe & tap)
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;

            this.canvas.addEventListener('touchstart', e => {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = performance.now();
                }
            }, { passive: true });

            this.canvas.addEventListener('touchend', e => {
                if (e.changedTouches.length === 1) {
                    const dx = e.changedTouches[0].clientX - touchStartX;
                    const dy = e.changedTouches[0].clientY - touchStartY;
                    const dt = performance.now() - touchStartTime;

                    if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 250) {
                        // Quick tap on board = Rotate
                        this.rotate(1);
                    } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
                        // Swipe horizontal
                        this.move(dx > 0 ? 1 : -1);
                    } else if (dy > 40) {
                        // Swipe down
                        if (dy > 100 && dt < 200) {
                            this.hardDrop();
                        } else {
                            this.softDrop();
                        }
                    }
                }
            }, { passive: true });

            // UI Actions
            this.btnAudio.addEventListener('click', () => this.toggleAudio());
            this.btnPause.addEventListener('click', () => this.togglePause());
            this.btnResume.addEventListener('click', () => this.togglePause());
            this.btnRestartFromPause.addEventListener('click', () => this.resetGame());
            this.btnPlayAgain.addEventListener('click', () => this.resetGame());

            // Leaderboard Modal
            this.btnLeaderboard.addEventListener('click', () => this.openLeaderboard());
            this.btnCloseModal.addEventListener('click', () => this.closeLeaderboard());
            this.btnModalPlay.addEventListener('click', () => {
                this.closeLeaderboard();
                if (this.gameOver) this.resetGame();
            });
            this.leaderboardModal.addEventListener('click', e => {
                if (e.target === this.leaderboardModal) this.closeLeaderboard();
            });

            // Score Submit Form
            this.scoreSubmitForm.addEventListener('submit', e => {
                e.preventDefault();
                this.submitScore();
            });
        }

        toggleAudio() {
            const info = this.sound.toggleMode();
            this.audioIcon.textContent = info.icon;
            this.btnAudio.title = info.label;
        }

        updateAudioButton() {
            const info = this.sound.getModeInfo();
            this.audioIcon.textContent = info.icon;
            this.btnAudio.title = info.label;
        }

        // ==========================================
        // 9. LEADERBOARD & BACKEND API INTEGRATION
        // ==========================================
        async fetchLeaderboard() {
            try {
                const res = await fetch(`api/scores.php?_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                const data = await res.json();
                if (data && data.scores) {
                    this.renderLeaderboard(data.scores);
                }
            } catch (err) {
                console.warn('Leaderboard fetch fallback to local:', err);
                this.renderLocalLeaderboard();
            }
        }

        renderLeaderboard(scores) {
            if (!this.leaderboardBody) return;
            if (!scores || scores.length === 0) {
                this.leaderboardBody.innerHTML = '<tr><td colspan="4" style="color: var(--text-muted);">Nenhum recorde registrado ainda.</td></tr>';
                return;
            }

            const medals = ['🥇', '🥈', '🥉'];
            this.leaderboardBody.innerHTML = scores.map((s, idx) => `
                <tr>
                    <td>${idx < 3 ? medals[idx] : idx + 1}</td>
                    <td><strong>${this.escapeHtml(s.name)}</strong></td>
                    <td>${this.formatNumber(s.score)}</td>
                    <td>${s.lines ?? 0}</td>
                </tr>
            `).join('');
        }

        renderLocalLeaderboard() {
            const local = [
                { name: 'ALEXEY', score: 15400, lines: 38 },
                { name: 'CYBER_PUNK', score: 12350, lines: 31 },
                { name: '4U_CHAMPION', score: 9800, lines: 24 },
                { name: 'NEON_BOT', score: 6400, lines: 16 }
            ];
            this.renderLeaderboard(local);
        }

        async submitScore() {
            const name = (this.playerNameInput.value || 'Jogador').trim();
            localStorage.setItem('tetris_player_name', name);

            const submitBtn = document.getElementById('btnSaveScore');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'SALVANDO...';
            }

            try {
                const payload = {
                    name: name,
                    score: this.score,
                    lines: this.lines,
                    level: this.level
                };

                const res = await fetch(`api/scores.php?_t=${Date.now()}`, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data && data.scores) {
                    this.renderLeaderboard(data.scores);
                }
                this.openLeaderboard();
            } catch (e) {
                console.error('Error submitting score to server:', e);
                this.openLeaderboard();
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'SALVAR RECORDE';
                }
            }
        }

        openLeaderboard() {
            this.fetchLeaderboard();
            this.leaderboardModal.classList.add('active');
        }

        closeLeaderboard() {
            this.leaderboardModal.classList.remove('active');
        }

        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    }

    // Start Game on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        const game = new TetrisGame();
        game.update();
    });

})();