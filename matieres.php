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
    
    $stmt = $db->query("SELECT * FROM matieres ORDER BY nom");
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    requireRole('directeur');
    
    $d = json_decode(file_get_contents('php://input'), true);
    
   
    if (empty($d['nom'])) {
        jsonResponse(['error' => 'Le nom de la matière est requis'], 422);
    }

    $stmt = $db->prepare("INSERT INTO matieres (nom, icone, coefficient) VALUES (?, ?, ?)");
    $success = $stmt->execute([
        sanitize($d['nom']), 
        $d['icone'] ?? '📚', 
        (int)($d['coefficient'] ?? 1)
    ]);

    if ($success) {
        jsonResponse([
            'success' => true, 
            'id' => $db->lastInsertId(),
            'message' => 'Matière créée avec succès'
        ]);
    } else {
        jsonResponse(['error' => 'Erreur lors de l\'insertion'], 500);
    }
}


if ($method === 'DELETE') {
    requireRole('directeur');
    
    $id = (int)($_GET['id'] ?? 0);
    
    if (!$id) {
        jsonResponse(['error' => 'ID requis'], 422);
    }

    
    try {
        $stmt = $db->prepare("DELETE FROM matieres WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            jsonResponse(['success' => true, 'message' => 'Matière supprimée']);
        } else {
            jsonResponse(['error' => 'Matière introuvable'], 404);
        }
    } catch (PDOException $e) {
        jsonResponse(['error' => 'Impossible de supprimer cette matière : elle est liée à des cours existants.'], 400);
    }
}