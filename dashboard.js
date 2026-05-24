
const API = 'api/';
let allClasses = [], allProfs = [], allMatieres = [];

const pageTitles = {overview:'Tableau de bord',profs:'Professeurs',eleves:'Élèves',classes:'Classes',edt:'Emplois du Temps',matieres:'Matières'};
function page(id, el){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById('page-'+id)?.classList.add('active');
    if(el) el.classList.add('active');
    document.getElementById('pageTitle').textContent = pageTitles[id]||id;
    if(id==='profs')    loadUsers('professeur');
    if(id==='eleves')   loadEleves();
    if(id==='classes')  loadClasses();
    if(id==='edt')      populateEdtSelects();
    if(id==='matieres') loadMatieres();
    window.scrollTo({top:0,behavior:'smooth'});
}
async function saveMatiere(){
    const nom = document.getElementById('m-nom').value.trim();
    const icone = document.getElementById('m-icone').value.trim();
    const coefficient = document.getElementById('m-coefficient').value;

    if(!nom || !coefficient){
        toast('❌ Nom et coefficient obligatoires','var(--red)');
        return;
    }

    const res = await api('matieres.php','POST',{
        nom,
        icone: icone || '📚',
        coefficient: parseFloat(coefficient)
    });

    if(res.success){
        toast('✅ Matière ajoutée');
        closeModal('modal-matiere');
        
        ['m-nom','m-icone','m-coefficient'].forEach(id => document.getElementById(id).value = '');
        allMatieres = []; 
        loadMatieres();
    } else {
        toast('❌ '+(res.error||'Erreur'),'var(--red)');
    }
}
function toggleTheme(){document.body.classList.toggle('light');localStorage.setItem('adminTheme',document.body.classList.contains('light')?'light':'dark');}
if(localStorage.getItem('adminTheme')==='light') document.body.classList.add('light');

function toast(msg,color='var(--green)'){
    const t=document.getElementById('toast');
    document.getElementById('toastMsg').textContent=msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),4000);
}


function openModal(id, role=''){
    document.getElementById(id).classList.add('open');
    if(id==='modal-user'){
        document.getElementById('user-role-hidden').value = role;
        document.getElementById('modal-user-title').textContent = role==='professeur' ? '👩‍🏫 Nouveau Professeur' : '🎒 Nouvel Élève';
        const isEleve = role==='eleve';
      
        document.getElementById('u-classe-row').style.display  = isEleve ? 'grid'  : 'none';
        document.getElementById('row-password').style.display  = isEleve ? 'none'  : 'block';
        document.getElementById('row-num-insc').style.display  = isEleve ? 'block' : 'none';
        document.getElementById('tempPwdBox').style.display    = 'none';
      
        ['u-nom','u-prenom','u-username','u-password','u-email','u-tel','u-num-insc','user-id'].forEach(i=>{
            const el=document.getElementById(i); if(el) el.value='';
        });
        document.getElementById('btnSaveUser').textContent = 'Enregistrer';
        document.getElementById('btnSaveUser').onclick = saveUser;
        
        const sel = document.getElementById('u-classe');
        sel.innerHTML = '<option value="">— Choisir —</option>'+allClasses.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
    }
    if(id==='modal-edt') populateEdtSelects();
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-bg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));

async function api(endpoint, method='GET', body=null){
    const opts={method,headers:{'Content-Type':'application/json'}};
    if(body) opts.body=JSON.stringify(body);
    const res=await fetch(API+endpoint,opts);
    return res.json();
}

async function loadStats(){
    const [users,classes]=await Promise.all([api('users.php'),api('classes.php')]);
    if(Array.isArray(users)){
        document.getElementById('countProfs').textContent  = users.filter(u=>u.role==='professeur').length;
        document.getElementById('countEleves').textContent = users.filter(u=>u.role==='eleve').length;
    }
    if(Array.isArray(classes)){
        document.getElementById('countClasses').textContent = classes.length;
        allClasses = classes;
        const s1=document.getElementById('filtreClasse'), s2=document.getElementById('edtFiltreClasse');
       
        s1.innerHTML = '<option value="">Toutes les classes</option>';
        s2.innerHTML = '<option value="">Choisir une classe…</option>';
        classes.forEach(c=>{
            s1.innerHTML += `<option value="${c.id}">${c.nom}</option>`;
            s2.innerHTML += `<option value="${c.id}">${c.nom}</option>`;
        });
    }
    document.getElementById('countEdt').textContent='—';
}

async function loadUsers(role){
    const data=await api(`users.php?role=${role}`);
    const body=document.getElementById(role==='professeur'?'profsBody':'elevesBody');
    if(!Array.isArray(data)){body.innerHTML=`<div style="padding:20px;color:var(--red)">${data.error||'Erreur'}</div>`;return;}
    if(role==='professeur') allProfs=data;
    body.innerHTML=data.length===0
        ?`<div style="padding:22px;text-align:center;color:var(--text3);font-size:13px">Aucun ${role} enregistré</div>`
        :data.map(u=>`<div class="tbl-row tbl-users">
            <div><div style="font-size:13px;font-weight:600">${u.prenom} ${u.nom}</div></div>
            <div style="font-size:12.5px;color:var(--text2)">${u.username}</div>
            <div style="font-size:12px;color:var(--text3)">${u.email||'—'}</div>
            <div style="font-size:11.5px;color:var(--text3)">${u.created_at?.split(' ')[0]||'—'}</div>
            <div><span class="tag ${u.actif?'t-green':'t-red'}">${u.actif?'Actif':'Inactif'}</span></div>
            <div style="display:flex;gap:5px">
                <button class="btn btn-ghost" style="padding:4px 9px;font-size:11.5px" onclick="editUser(${u.id})">✏️</button>
                <button class="btn btn-danger" style="padding:4px 9px;font-size:11.5px" onclick="deleteUser(${u.id},'${u.prenom} ${u.nom}')">🗑️</button>
            </div></div>`).join('');
}

async function loadEleves(){
    const classeId=document.getElementById('filtreClasse')?.value||'';
    const data=await api(`users.php?role=eleve${classeId?'&classe_id='+classeId:''}`);
    const body=document.getElementById('elevesBody');
    if(!Array.isArray(data)){body.innerHTML=`<div style="padding:20px;color:var(--red)">${data.error||'Erreur'}</div>`;return;}
    body.innerHTML=data.length===0
        ?`<div style="padding:22px;text-align:center;color:var(--text3);font-size:13px">Aucun élève enregistré</div>`
        :data.map(u=>`<div class="tbl-row" style="grid-template-columns:2fr 1fr 1.5fr 1.5fr 0.8fr 0.8fr">
            <div><div style="font-size:13px;font-weight:600">${u.prenom} ${u.nom}</div></div>
            <div style="font-size:12px;color:var(--text3)">${u.numero_inscription||'—'}</div>
            <div><span class="tag t-blue">${u.classe_nom||'—'}</span></div>
            <div style="font-size:12.5px;color:var(--text2)">${u.username}</div>
            <div><span class="tag ${u.actif?'t-green':'t-red'}">${u.actif?'Actif':'Inactif'}</span></div>
            <div style="display:flex;gap:5px">
                <button class="btn btn-ghost" style="padding:4px 9px;font-size:11.5px" onclick="editUser(${u.id})">✏️</button>
                <button class="btn btn-danger" style="padding:4px 9px;font-size:11.5px" onclick="deleteUser(${u.id},'${u.prenom} ${u.nom}')">🗑️</button>
            </div></div>`).join('');
}


async function saveUser(){
    const isEdit = !!document.getElementById('user-id').value;
    const role   = document.getElementById('user-role-hidden').value||'professeur';
    const body   = {
        nom:       document.getElementById('u-nom').value.trim(),
        prenom:    document.getElementById('u-prenom').value.trim(),
        username:  document.getElementById('u-username').value.trim(),
        email:     document.getElementById('u-email').value.trim(),
        telephone: document.getElementById('u-tel').value.trim(),
        role,
    };
    if(role==='eleve'){
        body.numero_inscription = document.getElementById('u-num-insc').value.trim();
        body.classe_id          = document.getElementById('u-classe').value;
        body.date_naissance     = document.getElementById('u-dob').value;
    } else {
        body.password = document.getElementById('u-password').value;
    }
    if(isEdit){
        body.id = document.getElementById('user-id').value;
        if(role!=='eleve' && !body.password) delete body.password;
    }
    const btn=document.getElementById('btnSaveUser');
    btn.disabled=true; btn.textContent='Enregistrement…';
    const res=await api('users.php',isEdit?'PUT':'POST',body);
    btn.disabled=false; btn.textContent='Enregistrer';
    if(res.success){
        
        if(role==='eleve' && res.temp_password){
            document.getElementById('tempPwdVal').textContent = res.temp_password;
            document.getElementById('tempPwdBox').style.display = 'block';
            btn.textContent='Fermer';
            btn.onclick=()=>{
                closeModal('modal-user');
                btn.onclick=saveUser;
                btn.textContent='Enregistrer';
                page('eleves', document.querySelector('.nav-item:nth-child(3)'));
            };
        } else {
            toast('✅ '+(isEdit?'Modifié !':'Créé !'));
            closeModal('modal-user');
           
            if(role==='professeur'){
                page('profs', document.querySelector('.nav-item:nth-child(2)'));
            }
        }
        role==='eleve' ? loadEleves() : loadUsers('professeur');
        loadStats();
    } else {
        toast('❌ '+(res.error||'Erreur'),'var(--red)');
    }
}

async function editUser(id){
    const data=await api(`users.php?id=${id}`);
    const role=data.role;
    openModal('modal-user',role);
    document.getElementById('user-id').value    = data.id;
    document.getElementById('u-nom').value      = data.nom;
    document.getElementById('u-prenom').value   = data.prenom;
    document.getElementById('u-username').value = data.username;
    document.getElementById('u-email').value    = data.email||'';
    document.getElementById('u-tel').value      = data.telephone||'';
    if(role==='eleve'){
        document.getElementById('u-num-insc').value = data.numero_inscription||'';
        document.getElementById('u-classe').value   = data.classe_id||'';
        document.getElementById('u-dob').value      = data.date_naissance||'';
    }
    document.getElementById('modal-user-title').textContent=`✏️ Modifier — ${data.prenom} ${data.nom}`;
}

async function deleteUser(id,name){
    if(!confirm(`Supprimer ${name} ?`)) return;
    const res=await api(`users.php?id=${id}`,'DELETE');
    if(res.success){toast('🗑️ Supprimé');loadUsers('professeur');loadEleves();loadStats();}
    else toast('❌ '+(res.error||'Erreur'),'var(--red)');
}

async function loadClasses(){
    const data=await api('classes.php');
    if(!Array.isArray(data)) return;
    allClasses=data;
    document.getElementById('classesBody').innerHTML=data.map(c=>`
        <div class="tbl-row" style="grid-template-columns:2fr 1fr 1fr 1fr 0.8fr">
            <div style="font-size:13px;font-weight:600">${c.nom}</div>
            <div style="font-size:12.5px;color:var(--text2)">${c.niveau}</div>
            <div style="font-size:12.5px;color:var(--text2)">${c.filiere||'—'}</div>
            <div style="font-size:12.5px;color:var(--text3)">${c.annee}</div>
            <div><button class="btn btn-danger" style="padding:4px 9px;font-size:11.5px" onclick="deleteClasse(${c.id},'${c.nom}')">🗑️</button></div>
        </div>`).join('');
}

async function saveClasse(){
    const res=await api('classes.php','POST',{
        nom:     document.getElementById('c-nom').value.trim(),
        niveau:  document.getElementById('c-niveau').value.trim(),
        filiere: document.getElementById('c-filiere').value.trim(),
        annee:   document.getElementById('c-annee').value.trim(),
    });
    if(res.success){toast('✅ Classe créée');closeModal('modal-classe');loadClasses();loadStats();}
    else toast('❌ '+(res.error||'Erreur'),'var(--red)');
}

async function deleteClasse(id,name){
    if(!confirm(`Supprimer la classe ${name} ?`)) return;
    const res=await api(`classes.php?id=${id}`,'DELETE');
    if(res.success){toast('🗑️ Supprimée');loadClasses();}
    else toast('❌ '+(res.error||'Erreur'),'var(--red)');
}

async function populateEdtSelects(){
    if(!allProfs.length)   {const d=await api('users.php?role=professeur');if(Array.isArray(d))allProfs=d;}
    if(!allClasses.length) {const d=await api('classes.php');if(Array.isArray(d))allClasses=d;}
    if(!allMatieres.length){const d=await api('matieres.php');if(Array.isArray(d))allMatieres=d;}
    document.getElementById('edt-prof').innerHTML    ='<option value="">— Prof —</option>'   +allProfs.map(p=>`<option value="${p.id}">${p.prenom} ${p.nom}</option>`).join('');
    document.getElementById('edt-classe').innerHTML  ='<option value="">— Classe —</option>' +allClasses.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
    document.getElementById('edt-matiere').innerHTML ='<option value="">— Matière —</option>'+allMatieres.map(m=>`<option value="${m.id}">${m.icone} ${m.nom}</option>`).join('');
}

async function loadEdt(){
    const classeId=document.getElementById('edtFiltreClasse').value;
    if(!classeId) return;
    const data=await api(`edt.php?classe_id=${classeId}`);
    const body=document.getElementById('edtBody');
    if(!Array.isArray(data)){body.innerHTML=`<div style="padding:20px;color:var(--red)">${data.error||'Erreur'}</div>`;return;}
    if(!data.length){body.innerHTML=`<div style="padding:22px;text-align:center;color:var(--text3);font-size:13px">Aucun créneau pour cette classe</div>`;return;}
    body.innerHTML=data.map(e=>`<div class="tbl-row tbl-edt">
        <div style="font-size:13px;font-weight:600">${e.jour}</div>
        <div style="font-size:12.5px;color:var(--text2)">${e.heure_debut.slice(0,5)}–${e.heure_fin.slice(0,5)}</div>
        <div><span class="tag t-purple">${e.icone} ${e.matiere}</span></div>
        <div style="font-size:12.5px">${e.prof_prenom} ${e.prof_nom}</div>
        <div style="font-size:12.5px;color:var(--text3)">${e.salle||'—'}</div>
        <div><button class="btn btn-danger" style="padding:4px 9px;font-size:11.5px" onclick="deleteEdt(${e.id})">🗑️</button></div>
    </div>`).join('');
    document.getElementById('countEdt').textContent=data.length;
}

async function saveEdt(){
    const res=await api('edt.php','POST',{
        classe_id:     document.getElementById('edt-classe').value,
        professeur_id: document.getElementById('edt-prof').value,
        matiere_id:    document.getElementById('edt-matiere').value,
        jour:          document.getElementById('edt-jour').value,
        heure_debut:   document.getElementById('edt-debut').value,
        heure_fin:     document.getElementById('edt-fin').value,
        salle:         document.getElementById('edt-salle').value,
    });
    if(res.success){toast('✅ Créneau ajouté');closeModal('modal-edt');loadEdt();}
    else toast('❌ '+(res.error||'Erreur'),'var(--red)');
}

async function deleteEdt(id){
    if(!confirm('Supprimer ce créneau ?')) return;
    const res=await api(`edt.php?id=${id}`,'DELETE');
    if(res.success){toast('🗑️ Supprimé');loadEdt();}
}

async function loadMatieres(){
    const data=await api('matieres.php');
    if(!Array.isArray(data)) return;
    allMatieres=data;
    document.getElementById('matieresBody').innerHTML=`
        <div class="tbl-wrap">
            <div class="tbl-head" style="grid-template-columns:0.5fr 2fr 1fr"><div>Icône</div><div>Matière</div><div>Coefficient</div></div>
            ${data.map(m=>`<div class="tbl-row" style="grid-template-columns:0.5fr 2fr 1fr">
                <div style="font-size:22px">${m.icone}</div>
                <div style="font-size:13px;font-weight:600">${m.nom}</div>
                <div style="font-size:13px;color:var(--text2)">${m.coefficient}</div>
            </div>`).join('')}
        </div>`;
}

function logout(){
    const m=document.getElementById('modal-logout');
    m.style.display='flex';
    m.onclick=(e)=>{if(e.target===m)closeLogoutModal();};
}
function closeLogoutModal(){
    document.getElementById('modal-logout').style.display='none';
}
async function confirmLogout(){
    await api('login.php?action=logout','POST').catch(()=>{});
    sessionStorage.removeItem('edulycee_user');
    window.location.href='index.html';
}

loadStats();
