const pageTitles = {
    overview: 'Tableau de bord',
    eleves: 'Mes Élèves',
    presences: 'Présences',
    docs: 'Mes Documents', 
    dm: 'Devoirs Maison',
    notes: 'Mes Notes'
};
 
function navigate(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const p = document.getElementById('page-' + id);
    if (p) p.classList.add('active');
    if (el) el.classList.add('active');
    else document.querySelectorAll('.nav-item').forEach(n => { if(n.getAttribute('onclick')?.includes("'"+id+"'")) n.classList.add('active'); });
    document.getElementById('pageTitle').textContent = pageTitles[id] || id;
    window.scrollTo({top:0,behavior:'smooth'});
}
 
function toggleTheme() { document.body.classList.toggle('light'); localStorage.setItem('theme', document.body.classList.contains('light')?'light':'dark'); }
if (localStorage.getItem('theme')==='light') document.body.classList.add('light');
 
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));
 
function toast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastText').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
 

let profData = null;
let tpItems  = [];
let dmItems  = [];
let matiereIdProf = null; 
 

async function init() {
   
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('pageDate').textContent = new Date().toLocaleDateString('fr-FR', optionsDate);
    
    const dateInput = document.getElementById('dateSeance');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
 
    try {
        
        const res = await fetch('api/me.php');
        profData = await res.json();
 
      
        if (!profData || profData.error) { 
            window.location.href = 'index.html'; 
            return; 
        }
 
        const prenom = profData.prenom || '';
        const nom = profData.nom || '';
        const classes = profData.classes || []; 
        
        
        if (classes.length > 0) {
            matiereIdProf = classes[0].matiere_id;
        }
        const matieres = [...new Set(classes.map(c => c.matiere_nom).filter(Boolean))];
        const matierePrincipale = matieres[0] || 'Non assignée';
 
        
        const docMatLabel = document.getElementById('doc-matiere-label');
        if (docMatLabel) docMatLabel.textContent = matierePrincipale;
 
      
        document.getElementById('sidebarInitials').textContent = ((prenom[0] || '') + (nom[0] || '')).toUpperCase();
        document.getElementById('sidebarNom').textContent = `${prenom} ${nom}`;
        document.getElementById('sidebarRole').textContent = matieres.length ? 'Prof. de ' + matieres[0] : 'Professeur';
 
        
        document.getElementById('bannerNom').textContent = `${prenom} ${nom}`;
        const bannerSub = document.getElementById('bannerSub');
        if (bannerSub) {
            bannerSub.textContent = matieres.length
                ? `${matieres.join(', ')} · ${classes.length} classe(s) assignée(s)`
                : 'Aucune classe assignée';
        }
 
       
        document.getElementById('statClasses').textContent = classes.length || '0';
        const statNoms = document.getElementById('statClassesNoms');
        if (statNoms) statNoms.textContent = classes.map(c => c.classe_nom).join(' · ') || '—';
        document.getElementById('statEleves').textContent = profData.total_eleves || '0';
 
    
        const ov = document.getElementById('classesOverview');
        if (ov) {
            ov.innerHTML = classes.map(c => `
                <div style="display:flex;align-items:center;gap:14px;padding:13px;border-radius:12px;background:rgba(184,168,255,.06);border:1px solid var(--border);margin-bottom:10px">
                    <div style="width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,rgba(184,168,255,.25),rgba(168,218,255,.2));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📚</div>
                    <div style="flex:1">
                        <div style="font-size:13.5px;font-weight:700;color:var(--text)">${c.classe_nom || 'Sans nom'}</div>
                        <div style="font-size:11.5px;color:var(--text3);margin-top:2px">${c.nb_eleves || 0} élève(s) · Coef. ${c.coefficient || '—'}</div>
                    </div>
                    <button class="btn btn-ghost" style="padding:6px 13px;font-size:12px" onclick="loadEleves(${c.classe_id});navigate('eleves',null)">Voir les élèves</button>
                </div>
            `).join('');
        }
 
       
        const optsWithDefault = '<option value="">-- Choisir une classe --</option>' + 
                                classes.map(c => `<option value="${c.classe_id}">${c.classe_nom}</option>`).join('');
        
        const optsSimple = classes.map(c => `<option value="${c.classe_id}">${c.classe_nom}</option>`).join('');
 
       
        if (document.getElementById('classeSelect')) 
            document.getElementById('classeSelect').innerHTML = optsWithDefault;
        
        
        if (document.getElementById('classeSelectPresence')) 
            document.getElementById('classeSelectPresence').innerHTML = optsWithDefault;
        
    
        if (document.getElementById('noteClasse')) 
            document.getElementById('noteClasse').innerHTML = optsWithDefault;
        
        
        if (document.getElementById('tp-classe')) 
            document.getElementById('tp-classe').innerHTML = optsSimple;
        
        if (document.getElementById('dm-classe')) 
            document.getElementById('dm-classe').innerHTML = optsSimple;
 
    } catch (e) { 
        console.error('Erreur lors de l\'initialisation :', e); 
    }
}

async function loadEleves(classeId) {
    if (!classeId) return;
    const grid = document.getElementById('elevesGrid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">Chargement...</div>';
    document.getElementById('classeSelect').value = classeId;
 
    const res = await fetch(`api/users.php?role=eleve&classe_id=${classeId}`);
    const eleves = await res.json();
    
    grid.innerHTML = eleves.map(e => `
        <div class="student-card">
            <div class="student-avatar">${(e.prenom[0]+e.nom[0]).toUpperCase()}</div>
            <div class="sname">${e.prenom} ${e.nom}</div>
            <div class="snum">N° ${e.numero_inscription||'—'}</div>
        </div>
    `).join('');
}
 

let elevesPresenceData = [];
 
function switchPresenceTab(tab) {
    const classeId = document.getElementById('classeSelectPresence').value;
    document.getElementById('section-feuille').style.display    = tab==='feuille'    ? 'block' : 'none';
    document.getElementById('section-historique').style.display = tab==='historique' ? 'block' : 'none';
    document.getElementById('tab-feuille').style.cssText    = tab==='feuille'    ? 'padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,rgba(184,168,255,.2),rgba(168,218,255,.15));color:var(--text);border:1px solid var(--border)' : 'padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text3)';
    document.getElementById('tab-historique').style.cssText = tab==='historique' ? 'padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;background:linear-gradient(135deg,rgba(184,168,255,.2),rgba(168,218,255,.15));color:var(--text);border:1px solid var(--border)' : 'padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text3)';
    if (tab === 'historique' && classeId) loadHistorique(classeId);
}
 
async function loadElevesPresence(classeId) {
    if (!classeId) return;
    const table = document.getElementById('presenceTable');
    table.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Chargement...</div>';
 
    try {
        const res    = await fetch(`api/users.php?role=eleve&classe_id=${classeId}`);
        const eleves = await res.json();
        elevesPresenceData = eleves;
 
        if (!Array.isArray(eleves) || eleves.length === 0) {
            table.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Aucun élève dans cette classe.</div>';
            return;
        }
 
        document.getElementById('presenceActions').style.display = 'flex';
        table.innerHTML = `
            <div class="attend-head">
                <div>Élève</div>
                <div>N° Inscription</div>
                <div>Statut</div>
            </div>
            ${eleves.map(e => `
                <div class="attend-row" data-id="${e.eleve_id || e.id}">
                    <div style="font-size:13px;font-weight:600;color:var(--text)">${e.prenom} ${e.nom}</div>
                    <div style="font-size:12px;color:var(--text3)">${e.numero_inscription||'—'}</div>
                    <div><button class="attend-btn present" onclick="togglePresence(this)">✅ Présent</button></div>
                </div>
            `).join('')}
        `;
    } catch(e) {
        table.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">Erreur : ${e.message}</div>`;
    }
}
 
function togglePresence(btn) {
    const etats = [{cls:'present',label:'✅ Présent'},{cls:'absent',label:'❌ Absent'},{cls:'retard',label:'⏰ Retard'}];
    const cur   = etats.findIndex(x => btn.classList.contains(x.cls));
    const next  = etats[(cur+1)%3];
    etats.forEach(x => btn.classList.remove(x.cls));
    btn.classList.add(next.cls);
    btn.textContent = next.label;
}
 
function marquerTous(st) {
    const map = {present:'✅ Présent', absent:'❌ Absent', retard:'⏰ Retard'};
    document.querySelectorAll('.attend-btn').forEach(b => {
        ['present','absent','retard'].forEach(c => b.classList.remove(c));
        b.classList.add(st); b.textContent = map[st];
    });
}
 
async function enregistrerPresences() {
    const date    = document.getElementById('dateSeance').value;
    const debut   = document.getElementById('heureDebut').value;
    const fin     = document.getElementById('heureFin').value;
 
    if (!date) { toast('⚠️ Choisissez une date !'); return; }
 
    const rows    = document.querySelectorAll('.attend-row');
    const absences = [];
 
    rows.forEach(row => {
        const btn   = row.querySelector('.attend-btn');
        const type  = btn.classList.contains('absent') ? 'Absent' : btn.classList.contains('retard') ? 'Retard' : null;
        if (!type) return; 
 
        const eleveId = row.dataset.id;
       absences.push({
    eleve_id:   parseInt(eleveId),
    matiere_id: matiereIdProf,
    date:       date,
    debut:      debut,
    fin:        fin,
    type:       type
});
    });
 
    if (absences.length === 0) {
        toast('✅ Tous les élèves sont présents — rien à enregistrer.');
        return;
    }
 
    try {
        const res    = await fetch('api/absences.php', {
            method:  'POST',
            headers: {'Content-Type': 'application/json'},
            body:    JSON.stringify(absences)
        });
        const result = await res.json();
        if (result.success) {
            toast(`✅ ${absences.length} absence(s) enregistrée(s) !`);
        } else {
            toast('❌ Erreur : ' + (result.error || 'Inconnue'));
        }
    } catch(e) {
        toast('❌ Erreur réseau : ' + e.message);
    }
}
async function loadHistorique(classeId) {
    const div = document.getElementById('historiqueTable');
    div.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3)">Chargement...</div>';
    try {
        const res  = await fetch(`api/absences.php?classe_id=${classeId}`);
        const data = await res.json();
 
        if (!Array.isArray(data) || data.length === 0) {
            div.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Aucune absence enregistrée pour cette classe.</div>';
            return;
        }
 
        div.innerHTML = `
            <div class="grade-wrap">
                <div style="display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr 1fr 1fr 50px;padding:12px 20px;background:rgba(184,168,255,.08);border-bottom:1px solid var(--border);font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3)">
                    <div>Élève</div><div>Date</div><div>Créneau</div><div>Type</div><div>Matière</div><div>Statut</div><div></div>
                </div>
                ${data.map(a => {
                    const dateF = new Date(a.date_absence).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
                    const creneau = `${(a.heure_debut||'').substring(0,5)||'—'} – ${(a.heure_fin||'').substring(0,5)||'—'}`;
                    const badge = a.justifiee
                        ? '<span style="padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(168,255,218,.15);color:#5fcfa0">Justifiée</span>'
                        : '<span style="padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(255,107,107,.15);color:#ff6b6b">Non justifiée</span>';
                    
                    return `<div style="display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr 1fr 1fr 50px;padding:12px 20px;border-bottom:1px solid rgba(255,182,218,.05);align-items:center;font-size:13px">
                        <div style="font-weight:600;color:var(--text)">${a.prenom||''} ${a.nom||''}</div>
                        <div style="color:var(--text2)">${dateF}</div>
                        <div style="color:var(--text3);font-size:12px">${creneau}</div>
                        <div>${a.type_absence||'Absent'}</div>
                        <div style="color:var(--text3)">${a.matiere_nom||'—'}</div>
                        <div>${badge}</div>
                        <div style="text-align:right">
                            <button onclick="supprimerAbsence(${a.id}, ${classeId})" 
                                    style="background:none; border:none; cursor:pointer; color:#ff6b6b; font-size:16px; padding:5px;" 
                                    title="Supprimer">
                                🗑️
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    } catch(e) {
        div.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">Erreur : ${e.message}</div>`;
    }
}
 
async function supprimerAbsence(id, classeId) {
    if (!confirm("Voulez-vous vraiment supprimer cette absence ?")) return;
    try {
        const res = await fetch(`api/absences.php?id=${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            toast('✅ Absence supprimée');
            loadHistorique(classeId); 
        } else {
            toast('❌ ' + (result.error || 'Erreur lors de la suppression'));
        }
    } catch (e) {
        toast('❌ Erreur réseau');
    }
}
 

async function loadNotesTable(classeId) {
    if (!classeId || !matiereIdProf) return;
    const container = document.getElementById('notesContainer');
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Chargement...</div>';
 
  
    const res = await fetch(`api/notes.php?classe_id=${classeId}&matiere_id=${matiereIdProf}`);
    const eleves = await res.json();
 
    container.innerHTML = `
        <div class="grade-wrap">
            <div class="grade-head">
                <div>Élève</div>
                <div style="text-align:center">DS 1</div>
                <div style="text-align:center">DS 2</div>
                <div style="text-align:center">DM / TP</div>
                <div>Appréciation</div>
            </div>
            ${eleves.map((e, i)=>`
                <div class="grade-row">
                    <div style="font-weight:600;">${e.nom.toUpperCase()} ${e.prenom}</div>
                    <div style="text-align:center"><input class="grade-input" type="number" step="0.5" data-eleve="${e.eleve_id}" data-type="DS1" value="${e.DS1 || ''}" oninput="majResultat(${i})"></div>
                    <div style="text-align:center"><input class="grade-input" type="number" step="0.5" data-eleve="${e.eleve_id}" data-type="DS2" value="${e.DS2 || ''}" oninput="majResultat(${i})"></div>
                    <div style="text-align:center"><input class="grade-input" type="number" step="0.5" data-eleve="${e.eleve_id}" data-type="DM" value="${e.DM || ''}" oninput="majResultat(${i})"></div>
                    <div><input class="appr-input" type="text" data-eleve="${e.eleve_id}" value="${e.appreciation || ''}" placeholder="Appréciation..." id="appr-${i}"></div>
                </div>
            `).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:16px">
            <button class="btn btn-primary" onclick="sauvegarderNotesEnMasse()">Enregistrer les notes</button>
        </div>
    `;
}
async function supprimerAbsence(id, classeId) {
    if (!confirm("Voulez-vous vraiment supprimer cette absence ?")) return;
 
    try {
        const res = await fetch(`api/absences.php?id=${id}`, {
            method: 'DELETE'
        });
        const result = await res.json();
 
        if (result.success) {
            toast('✅ Absence supprimée');
            loadHistorique(classeId); // On recharge le tableau
        } else {
            toast('❌ ' + result.error);
        }
    } catch (e) {
        toast('❌ Erreur réseau');
    }
}
async function sauvegarderNotesEnMasse() {
    const inputs = document.querySelectorAll('.grade-input');
    const notes = [];
    inputs.forEach(inp => {
        if(inp.value !== "") {
            notes.push({
                eleve_id: inp.dataset.eleve,
                matiere_id: matiereIdProf,
                type_note: inp.dataset.type,
                valeur: inp.value,
                trimestre: 1
            });
        }
    });
    
    const res = await fetch('api/notes.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(notes)
    });
    const result = await res.json();
    if(result.success) toast('✅ Notes enregistrées !');
    else toast('❌ Erreur lors de l\'enregistrement');
}
 
 
 
function ajouterDM() {
    const titre = document.getElementById('dm-titre').value.trim();
    if (!titre) { toast('⚠️ Entrez un titre !'); return; }
    dmItems.push({titre}); renderDM(); closeModal('modal-dm'); toast('✅ DM publié !');
}
function renderDM() {
    const list = document.getElementById('dmList');
    list.innerHTML = dmItems.map(dm => `<div class="content-item"><div class="ctitle">${dm.titre}</div></div>`).join('');
}
 

let docItems = [];
 
function ajouterDocument() {
    const titre  = document.getElementById('doc-titre').value.trim();
    const type   = document.getElementById('doc-type').value;
    const classeEl = document.getElementById('tp-classe');
    const file   = document.getElementById('doc-file').files[0];
 
    if (!titre) { toast('⚠️ Entrez un titre !'); return; }
    if (!file)  { toast('⚠️ Sélectionnez un fichier PDF !'); return; }
 
    const classeNom = classeEl.options[classeEl.selectedIndex]?.text || '';
    const typeEmoji = {Cours:'📚', Exercice:'📝', Corrige:'✅', Autre:'📎'}[type] || '📄';
    const matiereNom = (profData && profData.classes && profData.classes.length > 0)
        ? profData.classes[0].matiere_nom : '';
 
 
    const reader = new FileReader();
    reader.onload = function(ev) {
        const newDoc = {
            titre, type, typeEmoji, classeNom, fileName: file.name,
            matiere_nom: matiereNom,
            date: new Date().toISOString(),
            fileData: ev.target.result
        };
        docItems.push(newDoc);
 
        try {
            const allDocs = JSON.parse(localStorage.getItem('edulycee_docs') || '[]');
            allDocs.push(newDoc);
            localStorage.setItem('edulycee_docs', JSON.stringify(allDocs));
        } catch(e) {}
 
        renderDocuments();
        closeModal('modal-doc');
        toast('✅ Document publié pour ' + matiereNom + ' !');
        document.getElementById('doc-titre').value = '';
        document.getElementById('doc-file').value  = '';
        document.getElementById('statTP').textContent = docItems.length;
    };
    reader.readAsDataURL(file);
}
 
function renderDocuments() {
    const list = document.getElementById('tpList');
    if (!docItems.length) {
        list.innerHTML = `<div class="empty-state">
            <div class="empty-icon">📂</div>
            <h4>Aucun document</h4>
            <p>Cliquez sur le bouton pour ajouter un cours ou un corrigé.</p>
        </div>`;
        return;
    }
    list.innerHTML = '<div class="content-list">' + docItems.map((d, i) => `
        <div class="content-item">
            <div class="content-icon" style="background:rgba(168,218,255,.15)">${d.typeEmoji}</div>
            <div class="content-info">
                <div class="ctitle">${d.titre}</div>
                <div class="csub">${d.classeNom} · ${d.type} · ${d.fileName}</div>
            </div>
            <div class="content-right">
                <span class="tag tag-blue">Publié</span>
                <button class="btn btn-danger" style="padding:6px 11px;font-size:12px" onclick="supprimerDoc(${i})">Supprimer</button>
            </div>
        </div>
    `).join('') + '</div>';
}
 
function supprimerDoc(i) {
    const removed = docItems[i];
    docItems.splice(i, 1);
  
    try {
        let allDocs = JSON.parse(localStorage.getItem('edulycee_docs') || '[]');
        allDocs = allDocs.filter(d => !(d.titre === removed.titre && d.date === removed.date));
        localStorage.setItem('edulycee_docs', JSON.stringify(allDocs));
    } catch(e) {}
    renderDocuments();
    document.getElementById('statTP').textContent = docItems.length;
}

let notesData = {}; 
 
async function chargerTableauNotes() {
    const classeId = document.getElementById('noteClasse').value;
    const container = document.getElementById('notesContainer');
    
    if (!classeId) {
        container.innerHTML = `<div class="empty-state"><h4>Choisissez une classe</h4></div>`;
        return;
    }
 
    container.innerHTML = '<div style="text-align:center; padding:20px;">Chargement...</div>';
 
    try {
     
        const res = await fetch(`api/users.php`);
        const tousLesUsers = await res.json();
 
        
        const elevesDeLaClasse = tousLesUsers.filter(u => 
            u.role === 'eleve' && parseInt(u.classe_id) === parseInt(classeId)
        );
 
        if (elevesDeLaClasse.length === 0) {
            container.innerHTML = '<div class="empty-state"><h4>Aucun élève trouvé</h4><p>Vérifiez que les élèves sont bien assignés à cette classe.</p></div>';
            return;
        }
 
        let html = `
            <div class="grade-wrap" style="margin-top:20px;">
                <div class="grade-head">
                    <div style="padding-left:10px">Élève</div>
                    <div style="text-align:center">Note / 20</div>
                    <div style="text-align:center">Appréciation</div>
                </div>`;
 
        elevesDeLaClasse.forEach(e => {
            
            const idId = e.eleve_id || e.id;
            html += `
                <div class="grade-row">
                    <div style="font-weight:600; color:var(--text)">
                        ${e.nom.toUpperCase()} ${e.prenom}
                    </div>
                    <div style="text-align:center">
                        <input type="number" class="grade-input" placeholder="--" min="0" max="20" step="0.5" id="note-${idId}">
                    </div>
                    <div style="text-align:center">
                        <input type="text" placeholder="Commentaire..." 
                            style="width:90%; background:rgba(255,255,255,0.05); border:1px solid var(--border); color:white; padding:5px; border-radius:4px;" 
                            id="appr-${idId}">
                    </div>
                </div>`;
        });
 
        html += `</div>
            <div style="display:flex; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-primary" onclick="enregistrerNotesDansBase(${classeId})">Enregistrer le relevé</button>
            </div>`;
 
        container.innerHTML = html;
 
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div style="color:red; text-align:center;">Erreur lors du chargement via users.php</div>';
    }
}
async function enregistrerNotesDansBase(classeId) {
    const container = document.getElementById('notesContainer');
    const inputs = container.querySelectorAll('.grade-input');
    const notesAEnvoyer = [];
 
    const trimestre = 1; 
    const typeNote = "DS"; 
    
   
    inputs.forEach(input => {
        const eleveId = input.id.replace('note-', '');
        const valeur = input.value;
        const appreciation = document.getElementById(`appr-${eleveId}`).value;
 
        if (valeur !== "") { 
          notesAEnvoyer.push({
    eleve_id: parseInt(eleveId),
    matiere_id: parseInt(matiereIdProf),
    trimestre: 1, 
    type_note: 'DS1', 
    valeur: parseFloat(valeur),
    appreciation: appreciation
});
        }
    });
 
    if (notesAEnvoyer.length === 0) {
        alert("⚠️ Aucune note n'a été saisie.");
        return;
    }
 
    try {
        const res = await fetch('api/notes.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notesAEnvoyer)
        });
 
        const result = await res.json();
 
        if (result.success) {
            alert("✅ " + result.message);
            
            chargerTableauNotes();
        } else {
            alert("❌ Erreur : " + (result.error || "Impossible d'enregistrer"));
        }
    } catch (error) {
        console.error("Erreur enregistrement:", error);
        alert("❌ Erreur de connexion au serveur.");
    }
}
init();
 

function logout(){
    const m=document.getElementById('modal-logout');
    m.style.display='flex';
    m.onclick=(e)=>{if(e.target===m)closeLogoutModal();};
}
function closeLogoutModal(){
    document.getElementById('modal-logout').style.display='none';
}
async function confirmLogout(){
    await fetch('api/login.php?action=logout',{method:'POST'}).catch(()=>{});
    sessionStorage.removeItem('edulycee_user');
    window.location.href='index.html';}

 

async function api(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('api/' + endpoint, opts);
    return res.json();
}
 
const MSG = {
    channels: [],
    activeChannel: null,
    messages: [],
    lastId: 0,          
    pollTimer: null,
    myId: null,
    myRole: null,
    unread: {},
};
 
async function msgInit() {
   
    try {
        const me = await api('me.php');
        if (me && !me.error) {
            MSG.myId   = me.user_id;   
            MSG.myRole = me.role;
        }
    } catch(e) {}
    await msgLoadChannels();
}
 

async function msgLoadChannels() {
    const list = document.getElementById('msg-channel-list');
    list.innerHTML = '<div class="msg-loading"><div class="msg-spinner"></div><span>Chargement…</span></div>';
 
    try {
        
        const me = await api('me.php');
        if (!me) { list.innerHTML = '<p style="padding:16px;color:var(--text3);font-size:13px">Impossible de charger les canaux.</p>'; return; }
 
        MSG.channels = [];
 
        if (me.role === 'eleve') {
            
            const notes = await api(`notes.php?eleve_id=${me.eleve_id}&trimestre=1`);
            const matieres = (notes && notes.par_matiere) ? notes.par_matiere : [];
            matieres.forEach(m => {
                MSG.channels.push({
                    matiere_id:   m.matiere_id || 0,
                    matiere_nom:  m.matiere,
                    icone:        m.icone || '📚',
                    classe_id:    me.classe_id,
                    classe_nom:   me.classe_nom || 'Votre classe',
                    prof:         m.prof || ''
                });
            });
        } else if (me.role === 'professeur') {
            (me.classes || []).forEach(c => {
                MSG.channels.push({
                    matiere_id:  c.matiere_id,
                    matiere_nom: c.matiere_nom,
                    icone:       '📚',
                    classe_id:   c.classe_id,
                    classe_nom:  c.classe_nom,
                    prof:        me.prenom + ' ' + me.nom
                });
            });
        }
 
        msgRenderChannels();
    } catch(e) {
        list.innerHTML = '<p style="padding:16px;color:var(--text3);font-size:13px">Erreur de chargement.</p>';
    }
}

function msgRenderChannels() {
    const list = document.getElementById('msg-channel-list');
    if (!MSG.channels.length) {
        list.innerHTML = '<p style="padding:16px;font-size:12px;color:var(--text3)">Aucun canal disponible.</p>';
        return;
    }
 
    const colors = ['rgba(168,218,255,.18)','rgba(255,166,213,.18)','rgba(184,168,255,.18)','rgba(168,255,218,.18)','rgba(255,210,128,.18)'];
    list.innerHTML = MSG.channels.map((ch, i) => {
        const key   = ch.classe_id + '_' + ch.matiere_id;
        const unread = MSG.unread[key] || 0;
        const isActive = MSG.activeChannel && MSG.activeChannel.matiere_id === ch.matiere_id && MSG.activeChannel.classe_id === ch.classe_id;
        return `
        <div class="msg-chan-item${isActive?' active':''}" onclick="msgOpenChannel(${i})">
            <div class="msg-chan-icon" style="background:${colors[i%5]}">${ch.icone}</div>
            <div style="flex:1;min-width:0">
                <div class="msg-chan-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ch.matiere_nom}</div>
                <div class="msg-chan-sub">${ch.classe_nom}</div>
            </div>
            ${unread > 0 ? `<div class="msg-chan-unread">${unread}</div>` : ''}
        </div>`;
    }).join('');
}
 

async function msgOpenChannel(idx) {
    MSG.activeChannel = MSG.channels[idx];
    MSG.messages = [];
    MSG.lastId   = 0; 
 
    
    const key = MSG.activeChannel.classe_id + '_' + MSG.activeChannel.matiere_id;
    MSG.unread[key] = 0;
 
   
    msgRenderChannels();
    document.getElementById('msg-empty-state').style.display = 'none';
    const chatActive = document.getElementById('msg-chat-active');
    chatActive.style.display = 'flex';
 
    document.getElementById('msg-chat-icon').textContent   = MSG.activeChannel.icone;
    document.getElementById('msg-chat-title').textContent  = MSG.activeChannel.matiere_nom;
    document.getElementById('msg-chat-sub').textContent    = MSG.activeChannel.classe_nom + (MSG.activeChannel.prof ? ' · ' + MSG.activeChannel.prof : '');
 
    document.getElementById('msg-messages-inner').innerHTML = '<div class="msg-loading"><div class="msg-spinner"></div><span>Chargement des messages…</span></div>';
 
    
    if (MSG.pollTimer) clearInterval(MSG.pollTimer);
 
    
    await msgFetch();
 
    
    MSG.pollTimer = setInterval(msgPoll, 5000);
 
    document.getElementById('msg-input').focus();
}
 

async function msgFetch() {
    if (!MSG.activeChannel) return;
    const ch = MSG.activeChannel;
    const url = `messages.php?classe_id=${ch.classe_id}&matiere_id=${ch.matiere_id}`;
 
    try {
        const data = await api(url);
        MSG.messages = Array.isArray(data) ? data : [];
    MSG.lastId = MSG.messages.length ? MSG.messages[MSG.messages.length-1].id : 0;
        msgRenderMessages(true);
    } catch(e) {}
}
 
async function msgPoll() {
    if (!MSG.activeChannel) return;
    const ch = MSG.activeChannel;
    const url = `messages.php?classe_id=${ch.classe_id}&matiere_id=${ch.matiere_id}&after_id=${MSG.lastId || 0}`;
 
    try {
        const data = await api(url);
        if (Array.isArray(data) && data.length) {
            const existingIds = new Set(MSG.messages.map(m => m.id));
            const nouveaux = data.filter(m => !existingIds.has(m.id));
            if (nouveaux.length) {
                MSG.messages = [...MSG.messages, ...nouveaux];
                MSG.lastId = nouveaux[nouveaux.length-1].id;
                msgRenderMessages(false);
            }
        }
    } catch(e) {}
}
 

function msgRenderMessages(scrollBottom) {
    const inner = document.getElementById('msg-messages-inner');
    const wrap  = document.getElementById('msg-messages-wrap');
 
    if (!MSG.messages.length) {
        inner.innerHTML = `
            <div style="text-align:center;padding:44px 20px;color:var(--text3)">
                <div style="font-size:40px;margin-bottom:12px">🌱</div>
                <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:5px">Soyez le premier à écrire !</div>
                <div style="font-size:12px">Posez vos questions, partagez vos idées.</div>
            </div>`;
        return;
    }
 
    let html = '';
    let lastDate = '';
 
    MSG.messages.forEach(m => {
        const d    = new Date(m.created_at);
        const dateStr = d.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
        if (dateStr !== lastDate) {
            html += `<div class="msg-date-sep">${dateStr}</div>`;
            lastDate = dateStr;
        }
 
        const isOwn = (m.auteur_id == MSG.myId);
        const isProf = (m.auteur_role === 'professeur');
        const wrapClass = isOwn ? 'own' : (isProf ? 'other prof' : 'other');
        const roleClass = `msg-role-${m.auteur_role}`;
        const roleLbl   = m.auteur_role === 'professeur' ? 'Prof' : (m.auteur_role === 'directeur' ? 'Direction' : 'Élève');
        const timeStr   = d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
        const initiales = (m.prenom?.[0]||'') + (m.nom?.[0]||'');
 
        html += `
        <div class="msg-bubble-wrap ${wrapClass}">
            <div class="msg-bubble-meta">
                <div style="width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,var(--pink),var(--blue));display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white;flex-shrink:0">${initiales}</div>
                <span style="font-weight:600;font-size:11px;color:var(--text2)">${m.prenom} ${m.nom}</span>
                <span class="msg-role-badge ${roleClass}">${roleLbl}</span>
                ${isOwn ? `<button class="msg-delete-btn" onclick="msgDelete(${m.id})" title="Supprimer">✕</button>` : ''}
            </div>
            <div class="msg-bubble">${escHtml(m.contenu)}</div>
            <div class="msg-bubble-time">${timeStr}</div>
        </div>`;
    });
 
    inner.innerHTML = html;
    if (scrollBottom) {
        wrap.scrollTop = wrap.scrollHeight;
    } else {
        
        const nearBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 120;
        if (nearBottom) wrap.scrollTop = wrap.scrollHeight;
    }
}
 
async function msgSend() {
    if (!MSG.activeChannel) return;
    const inp = document.getElementById('msg-input');
    const contenu = inp.value.trim();
    if (!contenu) return;
 
    const btn = document.querySelector('.msg-send-btn');
    btn.disabled = true;
    inp.value = '';
    inp.style.height = 'auto';
 
    try {
        const ch = MSG.activeChannel;
    
        const res = await api('messages.php', 'POST', {
            classe_id:  ch.classe_id,
            matiere_id: ch.matiere_id,
            contenu
        });
        if (res && res.success && res.message) {
            MSG.messages.push(res.message);
            MSG.lastId = res.message.id; 
            msgRenderMessages(true);
        }
    } catch(e) { console.error('msgSend:', e); }
 
    btn.disabled = false;
    inp.focus();
}
 

async function msgDelete(id) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
        await api(`messages.php?id=${id}`, 'DELETE');
        MSG.messages = MSG.messages.filter(m => m.id != id);
        msgRenderMessages(false);
    } catch(e) { console.error('msgDelete:', e); }
}
 

function msgHandleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        msgSend();
    }
}

function msgAutoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
 
function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/\n/g,'<br>');
}
 

function msgDestroy() {
    if (MSG.pollTimer) { clearInterval(MSG.pollTimer); MSG.pollTimer = null; }
}
function showPage(pageId) {
   
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
 
 
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
 
    
    const targetNav = document.getElementById('nav-' + pageId);
    if (targetNav) {
        targetNav.classList.add('active');
    }
 
    
    if (pageId !== 'messagerie') {
        msgDestroy(); 
    } else {
      
        msgInit();
    }
}
