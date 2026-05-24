<?php
require_once 'config.php';
if (!isLoggedIn()) jsonResponse(['error' => 'Non authentifié'], 401);

$db = getDB();
$userId = (int)$_SESSION['user_id'];

$stmt = $db->prepare("
    SELECT u.id, u.nom, u.prenom, u.username, u.role, u.email, u.telephone 
    FROM utilisateurs u 
    WHERE u.id = ?
");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) jsonResponse(['error' => 'Utilisateur introuvable'], 404);

if ($user['role'] === 'eleve') {
    $stmtE = $db->prepare("
        SELECT e.id as eleve_id, e.classe_id, c.nom as classe_nom 
        FROM eleves e
        LEFT JOIN classes c ON e.classe_id = c.id
        WHERE e.utilisateur_id = ?
    ");
    $stmtE->execute([$userId]);
    $infosEleve = $stmtE->fetch();
    
    if ($infosEleve) {
        $user['eleve_id'] = $infosEleve['eleve_id'];
        $user['classe_id'] = $infosEleve['classe_id'];
        $user['classe_nom'] = $infosEleve['classe_nom'];
        $_SESSION['classe_id'] = $infosEleve['classe_id'];
        $_SESSION['eleve_id'] = $infosEleve['eleve_id'];
    }
}

if ($user['role'] === 'professeur') {
    
    $stmtP = $db->prepare("
        SELECT c.id as classe_id, c.nom as classe_nom, m.id as matiere_id, m.nom as matiere_nom
        FROM assignations a
        JOIN classes c ON a.classe_id = c.id
        JOIN matieres m ON a.matiere_id = m.id
        WHERE a.professeur_id = ?
    ");
    $stmtP->execute([$userId]);
    $assignations = $stmtP->fetchAll();

    $user['classes'] = $assignations;
    
    if (count($assignations) > 0) {
        $user['matiere_id'] = $assignations[0]['matiere_id'];
        $user['matiere_nom'] = $assignations[0]['matiere_nom'];
    }
}

jsonResponse($user);