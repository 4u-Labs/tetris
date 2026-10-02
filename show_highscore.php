<?php
$dbPath = __DIR__ . '/data/scores.sqlite';
$scores = [];
if (file_exists($dbPath)) {
    try {
        $pdo = new PDO("sqlite:" . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $stmt = $pdo->query("SELECT id, name, score, lines, level, strftime('%d/%m/%Y %H:%M', created_at) as date FROM scores ORDER BY score DESC, id ASC LIMIT 10");
        $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tetris - Recordes Top 10</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
    <link href="style.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #0a0b16, #161b33);
            color: #e0e0ff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .leaderboard-card {
            background: rgba(22, 27, 46, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 30px rgba(80, 250, 123, 0.1);
            max-width: 500px;
            width: 100%;
            padding: 30px;
            text-align: center;
        }
        h1 {
            font-family: 'Orbitron', sans-serif;
            color: #50fa7b;
            text-shadow: 0 0 10px rgba(80, 250, 123, 0.4);
            margin-bottom: 25px;
            font-size: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        th {
            color: #bd93f9;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.85rem;
            text-transform: uppercase;
            padding: 10px;
            border-bottom: 2px solid rgba(189, 147, 249, 0.3);
        }
        td {
            padding: 12px 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 0.95rem;
        }
        .rank-1 { color: #f1fa8c; font-weight: bold; }
        .rank-2 { color: #8be9fd; font-weight: bold; }
        .rank-3 { color: #ffb86c; font-weight: bold; }
        .btn-back {
            display: inline-block;
            background: linear-gradient(135deg, #00dfd8, #007cf0);
            color: #fff;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 12px;
            font-weight: bold;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 0.05em;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-back:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 223, 216, 0.4);
        }
    </style>
</head>
<body>
    <div class="leaderboard-card">
        <h1>🏆 Recordes</h1>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Jogador</th>
                    <th>Pontos</th>
                    <th>Linhas</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($scores)): ?>
                    <tr><td colspan="4" style="color: #6272a4;">Nenhum recorde registrado ainda.</td></tr>
                <?php else: ?>
                    <?php foreach ($scores as $index => $row): ?>
                        <tr class="<?php echo $index === 0 ? 'rank-1' : ($index === 1 ? 'rank-2' : ($index === 2 ? 'rank-3' : '')); ?>">
                            <td>
                                <?php 
                                    if ($index === 0) echo '🥇';
                                    elseif ($index === 1) echo '🥈';
                                    elseif ($index === 2) echo '🥉';
                                    else echo ($index + 1);
                                ?>
                            </td>
                            <td><?php echo htmlspecialchars($row['name']); ?></td>
                            <td><strong><?php echo number_format($row['score'], 0, ',', '.'); ?></strong></td>
                            <td><?php echo intval($row['lines']); ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        <a href="index.php" class="btn-back">🎮 Jogar Agora</a>
    </div>
</body>
</html>
