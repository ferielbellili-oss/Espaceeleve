<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;


require_once 'config.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'GET') {
    
    requireRole(['directeur', 'professeur', 'eleve']);
    
    $stmt = $db->query("SELECT * FROM classes ORDER BY niveau, nom");
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    requireRole('directeur');
    
    $d = json_decode(file_get_contents('php://input'), true);
    
    if (empty($d['nom']) || empty($d['niveau'])) {
        jsonResponse(['error' => 'Nom et niveau requis'], 422);
    }

    $stmt = $db->prepare("INSERT INTO classes (nom, niveau, filiere, annee) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        sanitize($d['nom']), 
        sanitize($d['niveau']), 
        sanitize($d['filiere'] ?? ''), 
        $d['annee'] ?? '2024/2025'
    ]);
    
    jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
}
if ($method === 'DELETE') {
    requireRole('directeur');
    
    $id = (int)($_GET['id'] ?? 0);
    
    if ($id <= 0) {
        jsonResponse(['error' => 'ID invalide'], 422);
    }

    
    $check = $db->prepare("SELECT COUNT(*) FROM eleves WHERE classe_id = ?");
    $check->execute([$id]);
    if ($check->fetchColumn() > 0) {
        jsonResponse(['error' => 'Impossible de supprimer : la classe contient encore des élèves'], 400);
    }

    $db->prepare("DELETE FROM classes WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}