<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
 
require_once 'config.php';
requireRole(['eleve', 'professeur', 'directeur']);
 
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$role   = $_SESSION['role'];
$userId = (int)$_SESSION['user_id'];
 
if ($method === 'GET') {
    $classe_id  = isset($_GET['classe_id'])  ? (int)$_GET['classe_id']  : 0;
    $matiere_id = isset($_GET['matiere_id']) ? (int)$_GET['matiere_id'] : 0;
 
    if (!$classe_id || !$matiere_id) {
        jsonResponse(['error' => 'classe_id et matiere_id requis'], 422);
    }
 
   
    if ($role === 'eleve') {
        if ((int)$_SESSION['classe_id'] !== $classe_id) {
            jsonResponse(['error' => 'Accès restreint à votre classe'], 403);
        }
    }
 

    if ($role === 'professeur') {
        $chk = $db->prepare("SELECT id FROM assignations WHERE professeur_id=? AND classe_id=? AND matiere_id=?");
        $chk->execute([$userId, $classe_id, $matiere_id]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Vous n\'enseignez pas cette matière dans cette classe'], 403);
        }
    }
 

    $after_id = isset($_GET['after_id']) ? (int)$_GET['after_id'] : 0;
 
    $stmt = $db->prepare("
        SELECT m.id, m.contenu, m.created_at, m.auteur_role,
               u.nom, u.prenom, u.id as auteur_id
        FROM messages m
        JOIN utilisateurs u ON u.id = m.auteur_id
        WHERE m.classe_id = ? AND m.matiere_id = ?
          AND m.id > ?
        ORDER BY m.id ASC
        LIMIT 200
    ");
    $stmt->execute([$classe_id, $matiere_id, $after_id]);
    jsonResponse($stmt->fetchAll());
}
 
if ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
 
  
    if (!is_array($d)) {
        jsonResponse(['error' => 'Corps de requête JSON invalide'], 400);
    }
 
    $classe_id  = (int)($d['classe_id']  ?? 0);
    $matiere_id = (int)($d['matiere_id'] ?? 0);
    $contenu    = trim($d['contenu']     ?? '');
 
    if (!$classe_id || !$matiere_id || !$contenu) {
        jsonResponse(['error' => 'classe_id, matiere_id et contenu requis'], 422);
    }
    if (mb_strlen($contenu) > 1000) {
        jsonResponse(['error' => 'Message trop long (max 1000 caractères)'], 422);
    }
 
 
    if ($role === 'eleve') {
        if ((int)$_SESSION['classe_id'] !== $classe_id) {
            jsonResponse(['error' => 'Accès restreint à votre classe'], 403);
        }
    }
 
   
    if ($role === 'professeur') {
        $chk = $db->prepare("SELECT id FROM assignations WHERE professeur_id=? AND classe_id=? AND matiere_id=?");
        $chk->execute([$userId, $classe_id, $matiere_id]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Assignation introuvable'], 403);
        }
    }
 
    $stmt = $db->prepare("
        INSERT INTO messages (classe_id, matiere_id, auteur_id, auteur_role, contenu)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([$classe_id, $matiere_id, $userId, $role, $contenu]);
 
    $newId = $db->lastInsertId();
    $row = $db->prepare("
        SELECT m.id, m.contenu, m.created_at, m.auteur_role, u.nom, u.prenom, u.id as auteur_id
        FROM messages m JOIN utilisateurs u ON u.id=m.auteur_id WHERE m.id=?
    ");
    $row->execute([$newId]);
    jsonResponse(['success' => true, 'message' => $row->fetch()]);
}
 

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID requis'], 422);
 
    if ($role !== 'directeur') {
        $chk = $db->prepare("SELECT auteur_id FROM messages WHERE id=?");
        $chk->execute([$id]);
        $msg = $chk->fetch();
        if (!$msg || (int)$msg['auteur_id'] !== $userId) {
            jsonResponse(['error' => 'Vous ne pouvez supprimer que vos propres messages'], 403);
        }
    }
 
    $db->prepare("DELETE FROM messages WHERE id=?")->execute([$id]);
    jsonResponse(['success' => true]);
}