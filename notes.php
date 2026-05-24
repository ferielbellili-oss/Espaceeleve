<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once 'config.php';
requireRole(['directeur', 'professeur', 'eleve']);

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'GET') {
   
    if (isset($_GET['eleve_id'])) {
        $eleve_id = (int)$_GET['eleve_id'];
        $trim = (int)($_GET['trimestre'] ?? 1);

        if ($_SESSION['role'] === 'eleve' && $_SESSION['eleve_id'] != $eleve_id) {
            jsonResponse(['error' => 'Accès refusé'], 403);
        }

        $stmt = $db->prepare("
            SELECT 
                m.id as matiere_id, m.nom as matiere_nom, m.icone, m.coefficient,
                u.nom as prof_nom, u.prenom as prof_prenom,
                n.type_note, n.valeur, n.appreciation
            FROM eleves e
            JOIN assignations a ON a.classe_id = e.classe_id
            JOIN matieres m ON a.matiere_id = m.id
            JOIN utilisateurs u ON a.professeur_id = u.id
            LEFT JOIN notes n ON (n.matiere_id = m.id AND n.eleve_id = e.id AND n.trimestre = ?)
            WHERE e.id = ?
            ORDER BY m.nom ASC
        ");
        
        $stmt->execute([$trim, $eleve_id]);
        $rows = $stmt->fetchAll();

        $parMatiere = [];
        foreach ($rows as $r) {
            $idM = $r['matiere_id'];
            if (!isset($parMatiere[$idM])) {
                $parMatiere[$idM] = [
                    'matiere' => $r['matiere_nom'],
                    'icone' => $r['icone'],
                    'coefficient' => $r['coefficient'],
                    'prof' => $r['prof_nom'] . ' ' . $r['prof_prenom'],
                    'ds1' => null, 'ds2' => null, 'dm' => null, 'tp' => null, 'moyenne' => null
                ];
            }
            $type = strtolower($r['type_note']);
            if (in_array($r['type_note'], ['DS1', 'DS2', 'DM', 'TP'])) {
                $parMatiere[$idM][$type] = $r['valeur'];
            }
        }

        foreach ($parMatiere as &$m) {
            $somme = 0; $nb = 0;
            foreach(['ds1', 'ds2', 'dm', 'tp'] as $t) {
                if ($m[$t] !== null) { $somme += $m[$t]; $nb++; }
            }
            if ($nb > 0) $m['moyenne'] = round($somme / $nb, 2);
        }
        jsonResponse(['par_matiere' => array_values($parMatiere)]);
    }

    
    if (isset($_GET['classe_id']) && isset($_GET['matiere_id'])) {
        requireRole(['directeur', 'professeur']);
        $trim = (int)($_GET['trimestre'] ?? 1);

        $stmt = $db->prepare("
            SELECT e.id as eleve_id, u.nom, u.prenom, e.numero_inscription,
                   MAX(CASE WHEN n.type_note='DS1' THEN n.valeur END) as DS1,
                   MAX(CASE WHEN n.type_note='DS2' THEN n.valeur END) as DS2,
                   MAX(CASE WHEN n.type_note='DM'  THEN n.valeur END) as DM,
                   MAX(CASE WHEN n.type_note='TP'  THEN n.valeur END) as TP,
                   MAX(n.appreciation) as appreciation
            FROM eleves e
            JOIN utilisateurs u ON u.id = e.utilisateur_id
            LEFT JOIN notes n ON n.eleve_id = e.id AND n.matiere_id = ? AND n.trimestre = ?
            WHERE e.classe_id = ?
            GROUP BY e.id, u.nom, u.prenom, e.numero_inscription
            ORDER BY u.nom ASC
        ");
        $stmt->execute([(int)$_GET['matiere_id'], $trim, (int)$_GET['classe_id']]);
        jsonResponse($stmt->fetchAll());
    }
}


if ($method === 'POST') {
    requireRole(['directeur', 'professeur']);
    
    
    $json = file_get_contents('php://input');
    $d = json_decode($json, true);
    
    if (!$d) {
        jsonResponse(['error' => 'Données JSON invalides ou vides'], 400);
    }

    $notes = isset($d[0]) ? $d : [$d];
    $profId = $_SESSION['user_id'] ?? null;

    if (!$profId) {
        jsonResponse(['error' => 'Session professeur introuvable'], 401);
    }

    try {
        $db->beginTransaction();
        
        
        $stmt = $db->prepare("
            INSERT INTO notes (eleve_id, matiere_id, professeur_id, trimestre, type_note, valeur, appreciation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE valeur = VALUES(valeur), appreciation = VALUES(appreciation)
        ");

        foreach ($notes as $n) {
           
            $val = ($n['valeur'] === '' || $n['valeur'] === null) ? null : (float)$n['valeur'];
            
          
            if ($val !== null && ($val < 0 || $val > 20)) {
                throw new Exception("La note doit être entre 0 et 20");
            }

            $stmt->execute([
                (int)$n['eleve_id'],
                (int)$n['matiere_id'],
                (int)$profId,
                (int)($n['trimestre'] ?? 1),
                $n['type_note'] ?? 'DS1',
                $val,
                $n['appreciation'] ?? null
            ]);
        }
        
        $db->commit();
        jsonResponse(['success' => true, 'message' => count($notes) . ' note(s) enregistrée(s)']);
        
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        jsonResponse(['error' => 'Erreur SQL : ' . $e->getMessage()], 500);
    }
}

if ($method === 'DELETE') {
    requireRole(['directeur', 'professeur']);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'ID requis'], 422);

    $db->prepare("DELETE FROM notes WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Note supprimée']);
}