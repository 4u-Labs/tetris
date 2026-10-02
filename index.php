<?php
// =========================================================================
// SISTEMA ANTI-CACHE ROBUSTO (4U.IA.BR)
// Impede cache de navegador, proxys e CDNs (Cloudflare / Hostinger CDN)
// =========================================================================
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");

// Geradores de versão baseados no último timestamp de modificação dos arquivos
$cssVersion = file_exists(__DIR__ . '/style.css') ? filemtime(__DIR__ . '/style.css') : time();
$jsVersion  = file_exists(__DIR__ . '/script.js') ? filemtime(__DIR__ . '/script.js') : time();
$nowTime    = time();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
    <title>Tetris - 4U.IA.BR</title>
    
    <!-- Meta tags Anti-Cache para compatibilidade total -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>
    <meta http-equiv="Pragma" content="no-cache"/>
    <meta http-equiv="Expires" content="0"/>
    
    <!-- Favicons -->
    <link href="/favicon-32x32.png?v=<?= $nowTime ?>" rel="icon" sizes="32x32" type="image/png"/>
    <link href="/favicon.ico?v=<?= $nowTime ?>" rel="shortcut icon"/>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet"/>
    
    <!-- Stylesheet com Anti-Cache Dinâmico -->
    <link href="style.css?v=<?= $cssVersion ?>" rel="stylesheet"/>
</head>
<body>
    <div class="main-wrapper">
        <!-- Header -->
        <header class="app-header">
            <div class="logo-area">
                <div class="logo-badge">
                    <!-- Retro Tetromino T SVG -->
                    <svg viewBox="0 0 24 24">
                        <path d="M4 4h16v6h-5v10H9V10H4V4z"/>
                    </svg>
                </div>
                <h1 class="logo-title">TETRIS</h1>
            </div>

            <div class="header-actions">
                <button class="icon-btn" id="btnAudio" title="Alternar Som" aria-label="Som">
                    <span id="audioIcon">🔊</span>
                </button>
                <button class="icon-btn" id="btnLeaderboard" title="Ver Recordes" aria-label="Recordes">
                    <span>🏆</span> <span class="hide-mobile">Recordes</span>
                </button>
                <button class="icon-btn" id="btnPause" title="Pausar Jogo" aria-label="Pausa">
                    <span id="pauseIcon">⏸</span>
                </button>
            </div>
        </header>

        <!-- Main Layout -->
        <div class="game-layout">
            <!-- Left Side: Hold & Score -->
            <div class="side-panel left-panel">
                <div class="panel-card">
                    <span class="card-title">HOLD (C)</span>
                    <canvas id="holdCanvas" width="72" height="72" class="mini-canvas"></canvas>
                </div>

                <div class="panel-card">
                    <span class="card-title">PONTOS</span>
                    <span class="stat-value score" id="scoreDisplay">0</span>
                </div>

                <div class="panel-card">
                    <span class="card-title">RECORDE</span>
                    <span class="stat-value" id="highScoreDisplay">0</span>
                </div>
            </div>

            <!-- Central Board Container -->
            <div class="board-container" id="boardContainer">
                <canvas id="tetrisCanvas" width="240" height="480"></canvas>

                <!-- Floating Toast Banner for Combo/Level -->
                <div class="toast-banner" id="toastBanner">TETRIS!</div>

                <!-- Pause Overlay -->
                <div class="board-overlay" id="pauseOverlay">
                    <h2 class="overlay-title paused">PAUSADO</h2>
                    <p class="overlay-subtitle">Pressione Continuar para retomar</p>
                    <button class="btn-primary" id="btnResume">CONTINUAR</button>
                    <button class="btn-secondary" id="btnRestartFromPause">REINICIAR</button>
                </div>

                <!-- Game Over Overlay -->
                <div class="board-overlay" id="gameOverOverlay">
                    <h2 class="overlay-title gameover">FIM DE JOGO</h2>
                    <p class="overlay-subtitle" id="gameOverFinalScore">Pontuação: 0</p>
                    
                    <form class="score-submit-form" id="scoreSubmitForm">
                        <input type="text" class="input-name" id="playerNameInput" placeholder="SEU NOME" maxlength="16" required autocomplete="off"/>
                        <button type="submit" class="btn-primary" id="btnSaveScore">SALVAR RECORDE</button>
                    </form>
                    
                    <button class="btn-secondary" id="btnPlayAgain">JOGAR NOVAMENTE</button>
                </div>
            </div>

            <!-- Right Side: Next, Level, Lines -->
            <div class="side-panel right-panel">
                <div class="panel-card">
                    <span class="card-title">PRÓXIMA</span>
                    <canvas id="nextCanvas" width="72" height="72" class="mini-canvas"></canvas>
                </div>

                <div class="panel-card">
                    <span class="card-title">NÍVEL</span>
                    <span class="stat-value" id="levelDisplay">1</span>
                </div>

                <div class="panel-card">
                    <span class="card-title">LINHAS</span>
                    <span class="stat-value" id="linesDisplay">0</span>
                </div>
            </div>
        </div>

        <!-- Desktop Controls Legend -->
        <div class="desktop-help">
            <div class="help-item"><span class="kbd">◄</span> <span class="kbd">►</span> Mover</div>
            <div class="help-item"><span class="kbd">▲</span> / <span class="kbd">X</span> Girar</div>
            <div class="help-item"><span class="kbd">▼</span> Descer</div>
            <div class="help-item"><span class="kbd">ESPAÇO</span> Queda Imediata (Hard Drop)</div>
            <div class="help-item"><span class="kbd">C</span> / <span class="kbd">SHIFT</span> Guardar (Hold)</div>
            <div class="help-item"><span class="kbd">P</span> Pausar</div>
        </div>

        <!-- Mobile Touch Controller -->
        <div class="virtual-controller" id="virtualController">
            <div class="touch-grid">
                <!-- D-Pad (Left, Down, Right) -->
                <div class="touch-dpad">
                    <div></div>
                    <div></div>
                    <div></div>
                    <button class="t-btn" id="tLeft" aria-label="Mover Esquerda">◄</button>
                    <button class="t-btn" id="tDown" aria-label="Descer Mais Rápido">▼</button>
                    <button class="t-btn" id="tRight" aria-label="Mover Direita">►</button>
                </div>

                <!-- Action Buttons (Hold, Rotate, Hard Drop) -->
                <div class="touch-actions">
                    <button class="t-btn t-hold" id="tHold" aria-label="Guardar Peça">⇄<span>HOLD</span></button>
                    <button class="t-btn t-rotate" id="tRotate" aria-label="Girar Peça">↻<span>GIRAR</span></button>
                    <button class="t-btn t-drop" id="tHardDrop" aria-label="Queda Imediata">⤓<span>HARD DROP</span></button>
                </div>
            </div>
        </div>
    </div>

    <!-- Leaderboard Modal -->
    <div class="modal-backdrop" id="leaderboardModal">
        <div class="modal-card">
            <div class="modal-header">
                <h3 class="modal-title">🏆 TOP 10 RECORDES</h3>
                <button class="btn-close" id="btnCloseModal">&times;</button>
            </div>
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jogador</th>
                        <th>Pontos</th>
                        <th>Linhas</th>
                    </tr>
                </thead>
                <tbody id="leaderboardBody">
                    <tr><td colspan="4" style="color: var(--text-muted);">Carregando recordes...</td></tr>
                </tbody>
            </table>
            <button class="btn-primary" id="btnModalPlay">JOGAR AGORA</button>
        </div>
    </div>

    <!-- 4U.IA.BR Standardized Footer -->
    <style>
        .footer-clean {
            position: relative;
            width: 100%;
            z-index: 10;
            padding: 1.5rem 0;
            background: rgba(10, 13, 26, 0.4);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: auto;
        }
        .footer-clean span {
            font-size: 0.65rem;
            color: rgba(255, 255, 255, 0.35);
            letter-spacing: 0.25em;
            text-transform: uppercase;
            font-weight: 600;
        }
        .hide-mobile {
            display: inline;
        }
        @media (max-width: 480px) {
            .hide-mobile {
                display: none;
            }
        }
    </style>
    <footer class="footer-clean">
        <span>© 2026 4U.IA.BR</span>
    </footer>

    <!-- Game Engine com Anti-Cache Dinâmico -->
    <script defer src="script.js?v=<?= $jsVersion ?>"></script>
</body>
</html>
