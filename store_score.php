<?php
// Redireciona com segurança ou processa via API
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once __DIR__ . '/api/scores.php';
    exit;
}
header("Location: index.php");
exit;
