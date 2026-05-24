<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
 
require_once 'config.php';
 

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    requireRole(['directeur', 'professeur']);
} else {
    requireRole('directeur');
}
 
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $db->prepare("
            SELECT u.id, u.nom, u.prenom, u.username, u.role, u.email, u.telephone, u.date_naissance, u.actif,
                   e.id as eleve_id, e.numero_inscription, e.classe_id, c.nom as classe_nom
            FROM utilisateurs u
            LEFT JOIN eleves e ON e.utilisateur_id = u.id
            LEFT JOIN classes c ON c.id = e.classe_id
            WHERE u.id = ?
        ");
        $stmt->execute([(int)$_GET['id']]);
        $user = $stmt->fetch();
        if (!$user) jsonResponse(['error' => 'Utilisateur introuvable'], 404);
        jsonResponse($user);
    }
 
    $role     = $_GET['role']     ?? null;
    $classeId = isset($_GET['classe_id']) ? (int)$_GET['classe_id'] : null;
 
    $sql  = "SELECT u.id, u.nom, u.prenom, u.username, u.role, u.email, u.actif, u.created_at,
                    e.id as eleve_id, e.numero_inscription, e.classe_id, c.nom as classe_nom
             FROM utilisateurs u
             LEFT JOIN eleves e ON e.utilisateur_id = u.id
             LEFT JOIN classes c ON c.id = e.classe_id";
    $params = [];
    $where  = [];
 
    if ($role)     { $where[] = "u.role = ?";    $params[] = $role; }
    if ($classeId) { $where[] = "e.classe_id = ?"; $params[] = $classeId; }
    if ($where)    { $sql .= " WHERE " . implode(" AND ", $where); }
 
    $sql .= " ORDER BY u.nom";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}
 
if ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    

    $password_choisi_par_directeur = !empty($d['password']) ? $d['password'] : '123456';
    
    $password_final = password_hash($password_choisi_par_directeur, PASSWORD_DEFAULT);
 
    $role = $d['role'] ?? '';
 
    if ($role === 'professeur' || $role === 'directeur') {
        $stmt = $db->prepare("INSERT INTO utilisateurs (nom, prenom, username, password, role, email) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            sanitize($d['nom']),
            sanitize($d['prenom']),
            sanitize($d['username']),
            $password_final, 
            $role,
            sanitize($d['email'] ?? '')
        ]);
        jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
    } 
   elseif ($role === 'eleve') {
        try {
            $db->beginTransaction();
 
           
            $num_inscription = sanitize($d['numero_inscription'] ?? '');
 
            $password_eleve = password_hash($num_inscription, PASSWORD_DEFAULT);
            
            $stmtU = $db->prepare("INSERT INTO utilisateurs (nom, prenom, username, password, role) VALUES (?, ?, ?, ?, 'eleve')");
            $stmtU->execute([
                sanitize($d['nom']),
                sanitize($d['prenom']),
                sanitize($d['username']),
                $password_eleve 
            ]);
            $userId = $db->lastInsertId();
 
            
            $stmtE = $db->prepare("INSERT INTO eleves (utilisateur_id, classe_id, numero_inscription) VALUES (?, ?, ?)");
            $stmtE->execute([
                $userId,
                (int)$d['classe_id'],
                $num_inscription
            ]);
 
            $db->commit();
            jsonResponse(['success' => true, 'id' => $userId]);
        } catch (Exception $e) {
            $db->rollBack();
            jsonResponse(['error' => 'Erreur : ' . $e->getMessage()], 500);
        }
    
    }
}

if ($method === 'PUT') {
    $d = json_decode(file_get_contents('php://input'), true);
    if (!isset($d['id'])) jsonResponse(['error' => 'ID requis'], 422);
 
    $stmt = $db->prepare("UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, actif = ? WHERE id = ?");
    $stmt->execute([
        sanitize($d['nom']),
        sanitize($d['prenom']),
        sanitize($d['email'] ?? ''),
        (int)($d['actif'] ?? 1),
        (int)$d['id']
    ]);
 
    jsonResponse(['success' => true, 'message' => 'Utilisateur mis à jour']);
}
 

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'id requis'], 422);
 
  
    $stmt = $db->prepare("SELECT role FROM utilisateurs WHERE id = ?");
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    
    if (!$u) jsonResponse(['error' => 'Utilisateur introuvable'], 404);
    if ($u['role'] === 'directeur') jsonResponse(['error' => 'Impossible de supprimer le directeur'], 403);
 
    $db->prepare("DELETE FROM utilisateurs WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Utilisateur supprimé']);
}