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
 
   
    $classe_id = isset($_GET['classe_id']) ? (int)$_GET['classe_id'] : null;
    $prof_id   = isset($_GET['prof_id']) ? (int)$_GET['prof_id'] : null;
 
    if (!$classe_id && !$prof_id && isLoggedIn()) {
        if ($_SESSION['role'] === 'eleve') {
            $classe_id = (int)$_SESSION['classe_id'];
        } elseif ($_SESSION['role'] === 'professeur') {
            $prof_id = (int)$_SESSION['user_id'];
        }
    }
 
    if ($_SESSION['role'] === 'eleve') {
        if (empty($_SESSION['classe_id'])) {
            jsonResponse(['error' => 'Aucune classe assignée à votre compte'], 403);
        }
        if ($classe_id && $classe_id !== (int)$_SESSION['classe_id']) {
            jsonResponse(['error' => 'Accès restreint à votre classe'], 403);
        }
        $classe_id = (int)$_SESSION['classe_id']; 
    }
 
   
    if ($classe_id) {
        $stmt = $db->prepare("
            SELECT edt.id, edt.jour, edt.heure_debut, edt.heure_fin, edt.salle,
                   m.id as matiere_id, m.nom as matiere_nom, m.icone as icone,
                   u.nom as prof_nom, u.prenom as prof_prenom,
                   a.classe_id, c.nom as classe_nom
            FROM emploi_du_temps edt
            JOIN assignations a ON a.id = edt.assignation_id
            JOIN matieres m      ON m.id = a.matiere_id
            JOIN utilisateurs u  ON u.id = a.professeur_id
            JOIN classes c       ON c.id = a.classe_id
            WHERE a.classe_id = ?
            ORDER BY FIELD(edt.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), edt.heure_debut
        ");
        $stmt->execute([$classe_id]);
        jsonResponse($stmt->fetchAll());
    }
 
    
    if ($prof_id) {
        $stmt = $db->prepare("
            SELECT edt.id, edt.jour, edt.heure_debut, edt.heure_fin, edt.salle,
                   m.id as matiere_id, m.nom as matiere_nom, m.icone as icone,
                   a.classe_id, c.nom as classe_nom
            FROM emploi_du_temps edt
            JOIN assignations a ON a.id = edt.assignation_id
            JOIN matieres m     ON m.id = a.matiere_id
            JOIN classes c      ON c.id = a.classe_id
            WHERE a.professeur_id = ?
            ORDER BY FIELD(edt.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), edt.heure_debut
        ");
        $stmt->execute([$prof_id]);
        jsonResponse($stmt->fetchAll());
    }
 
    jsonResponse(['error' => 'Paramètre classe_id ou prof_id manquant'], 422);
}
 

if ($method === 'POST') {
    requireRole('directeur');
    $d = json_decode(file_get_contents('php://input'), true);
 
    if (empty($d['professeur_id']) || empty($d['matiere_id']) || empty($d['classe_id']) || empty($d['jour'])) {
        jsonResponse(['error' => 'Données incomplètes'], 422);
    }
 
   
    $stmtA = $db->prepare("SELECT id FROM assignations WHERE professeur_id=? AND matiere_id=? AND classe_id=?");
    $stmtA->execute([(int)$d['professeur_id'], (int)$d['matiere_id'], (int)$d['classe_id']]);
    $assignation = $stmtA->fetch();
 
    if (!$assignation) {
        $ins = $db->prepare("INSERT INTO assignations (professeur_id, matiere_id, classe_id, heures_semaine) VALUES (?,?,?,?)");
        $ins->execute([(int)$d['professeur_id'], (int)$d['matiere_id'], (int)$d['classe_id'], (int)($d['heures_semaine'] ?? 2)]);
        $assignationId = $db->lastInsertId();
    } else {
        $assignationId = $assignation['id'];
    }
 
  
    $stmt = $db->prepare("
        INSERT INTO emploi_du_temps (assignation_id, jour, heure_debut, heure_fin, salle)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $assignationId,
        $d['jour'],
        $d['heure_debut'],
        $d['heure_fin'],
        $d['salle'] ?? null
    ]);
 
    jsonResponse(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Créneau ajouté']);
}
 

if ($method === 'DELETE') {
    requireRole('directeur');
    $id = (int)($_GET['id'] ?? 0);
 
    if (!$id) jsonResponse(['error' => 'ID requis'], 422);
 
    $stmt = $db->prepare("DELETE FROM emploi_du_temps WHERE id = ?");
    $stmt->execute([$id]);
 
    jsonResponse(['success' => true, 'message' => 'Créneau supprimé']);
}