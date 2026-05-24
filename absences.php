<?php


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once 'config.php';
requireRole(['directeur', 'professeur', 'eleve']);

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($_SESSION['role'] === 'eleve') {
        $eleve_id = $_SESSION['eleve_id'];
        $stmt = $db->prepare("SELECT a.*, m.nom as matiere_nom FROM absences a LEFT JOIN matieres m ON a.matiere_id = m.id WHERE a.eleve_id = ? ORDER BY a.date_absence DESC");
        $stmt->execute([$eleve_id]);
        jsonResponse($stmt->fetchAll());
    }

    if (isset($_GET['classe_id'])) {
        $stmt = $db->prepare("SELECT a.*, u.nom, u.prenom, m.nom as matiere_nom FROM absences a JOIN eleves e ON a.eleve_id = e.id JOIN utilisateurs u ON e.utilisateur_id = u.id LEFT JOIN matieres m ON a.matiere_id = m.id WHERE e.classe_id = ? ORDER BY a.date_absence DESC");
        $stmt->execute([(int)$_GET['classe_id']]);
        jsonResponse($stmt->fetchAll());
    }
}


if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $prof_id = $_SESSION['user_id'];
    $absences = isset($input[0]) ? $input : [$input];

    $stmt = $db->prepare("INSERT INTO absences (eleve_id, matiere_id, professeur_id, date_absence, heure_debut, heure_fin, type_absence) VALUES (?, ?, ?, ?, ?, ?, ?)");
    foreach ($absences as $abs) {
        $stmt->execute([$abs['eleve_id'], $abs['matiere_id'], $prof_id, $abs['date'], $abs['debut'], $abs['fin'], $abs['type']]);
    }
    jsonResponse(['success' => true]);
}


if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    $stmt = $db->prepare("UPDATE absences SET justifiee = 1 WHERE id = ?");
    $stmt->execute([$input['id']]);
    jsonResponse(['success' => true]);
}


if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'ID manquant'], 400);

    $stmt = $db->prepare("DELETE FROM absences WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}