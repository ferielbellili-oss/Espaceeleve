<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once 'config.php'; 

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? ''); 
$password = $input['password'] ?? ''; 

if (!$username || !$password) {
    jsonResponse(['error' => 'Identifiant et mot de passe requis'], 422);
}

$db = getDB();

$stmt = $db->prepare("SELECT id, nom, prenom, username, password, role, actif FROM utilisateurs WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(['error' => 'Identifiant ou mot de passe incorrect'], 401);
}

if (!$user['actif']) {
    jsonResponse(['error' => 'Ce compte est désactivé'], 403);
}


$_SESSION['user_id']   = $user['id'];
$_SESSION['username']  = $user['username'];
$_SESSION['role']      = $user['role'];
$_SESSION['nom']       = $user['nom'];
$_SESSION['prenom']    = $user['prenom'];

$extra = [];
if ($user['role'] === 'eleve') {
    $stmt2 = $db->prepare("
        SELECT e.id as eleve_id, e.numero_inscription, c.id as classe_id, c.nom as classe_nom 
        FROM eleves e 
        LEFT JOIN classes c ON e.classe_id = c.id 
        WHERE e.utilisateur_id = ?
    ");
    $stmt2->execute([$user['id']]);
    $extra = $stmt2->fetch() ?: [];
    
    $_SESSION['eleve_id']  = $extra['eleve_id'] ?? null;
    $_SESSION['classe_id'] = $extra['classe_id'] ?? null;
}


if ($user['role'] === 'directeur') {
    $redirectTo = 'dashboard.html';
} elseif ($user['role'] === 'professeur') {
    $redirectTo = 'teacher-lycee.html';
} else {
    $redirectTo = 'eleve-lycee.html';
}

jsonResponse([
    'success' => true,
    'user' => [
        'id'         => $user['id'],
        'nom'        => $user['nom'],
        'prenom'     => $user['prenom'],
        'role'       => $user['role'],
        'redirectTo' => $redirectTo, 
        'extra'      => $extra
    ]
]); 
