<?php

define('DB_HOST', 'localhost');
define('DB_NAME', 'edulycee');
define('DB_USER', 'root');       
define('DB_PASS', '');            
define('DB_CHARSET', 'utf8mb4');

define('SESSION_NAME', 'edulycee_session');
define('BASE_URL', 'http://localhost/edulycee/');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            die(json_encode(['error' => 'Connexion DB échouée : ' . $e->getMessage()]));
        }
    }
    return $pdo;
}


session_name(SESSION_NAME);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}


function jsonResponse($data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}


function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}


function requireRole($roles): void {
    if (!isLoggedIn()) {
        jsonResponse(['error' => 'Non authentifié'], 401);
    }
    $roles = (array)$roles;
    if (!in_array($_SESSION['role'], $roles)) {
        jsonResponse(['error' => 'Accès refusé'], 403);
    }
}


function sanitize($data) {
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}