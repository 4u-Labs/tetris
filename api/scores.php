<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbPath = __DIR__ . '/../data/scores.sqlite';

function getDb($path) {
    $firstRun = !file_exists($path);
    $pdo = new PDO("sqlite:" . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    if ($firstRun) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                score INTEGER NOT NULL,
                lines INTEGER DEFAULT 0,
                level INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_scores ON scores(score DESC)");

        // Seed with classic leaderboard
        $stmt = $pdo->prepare("INSERT INTO scores (name, score, lines, level) VALUES (?, ?, ?, ?)");
        $seeds = [
            ['ALEXEY', 15400, 38, 4],
            ['CYBER_PUNK', 12350, 31, 3],
            ['4U_CHAMPION', 9800, 24, 2],
            ['NEON_BOT', 6400, 16, 2],
            ['RETRO_FAN', 3500, 9, 1]
        ];
        foreach ($seeds as $s) {
            $stmt->execute($s);
        }
    }
    return $pdo;
}

try {
    $pdo = getDb($dbPath);

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $name = trim(strip_tags($input['name'] ?? 'Jogador'));
        if (empty($name)) {
            $name = 'Jogador';
        }
        $name = mb_substr($name, 0, 16);

        $score = max(0, intval($input['score'] ?? 0));
        $lines = max(0, intval($input['lines'] ?? 0));
        $level = max(0, intval($input['level'] ?? 0));

        if ($score > 0) {
            $stmt = $pdo->prepare("INSERT INTO scores (name, score, lines, level, created_at) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))");
            $stmt->execute([$name, $score, $lines, $level]);
        }

        // Fetch top 10
        $stmt = $pdo->query("SELECT id, name, score, lines, level, strftime('%d/%m/%Y %H:%M', created_at) as date FROM scores ORDER BY score DESC, id ASC LIMIT 10");
        $top = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'message' => 'Pontuação registrada com sucesso!',
            'scores' => $top
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Default: GET Top 10
    $stmt = $pdo->query("SELECT id, name, score, lines, level, strftime('%d/%m/%Y %H:%M', created_at) as date FROM scores ORDER BY score DESC, id ASC LIMIT 10");
    $top = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'scores' => $top
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno ao processar ranking',
        'details' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
