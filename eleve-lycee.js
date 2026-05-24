
const API_URL = 'api/';
let currentEleveId = null;
let cachedMatieres = [];


const pageTitles = {
    overview:'Tableau de bord', notes:'Mes Notes',
    absences:'Mes Absences', edt:'Emploi du Temps',
    cours:'Mes Cours', messagerie:'Messagerie'
};

function navigate(pageId, el) {
  
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });

    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

   
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
    }

    
    if (el) el.classList.add('active');
    else {
        const navEl = document.getElementById('nav-' + pageId);
        if (navEl) navEl.classList.add('active');
    }

  
    document.getElementById('pageTitle').textContent = pageTitles[pageId] || pageId;
    window.scrollTo({top:0, behavior:'smooth'});


    if (pageId === 'edt')         loadEdt();
    if (pageId === 'absences')    loadAbsences();
    if (pageId === 'cours')       loadCours();
    if (pageId === 'messagerie')  msgInit();
    else                          msgDestroy();
}

async function api(endpoint, method='GET', body=null) {
    const opts = {method, headers:{'Content-Type':'application/json'}};
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_URL + endpoint, opts);
    return res.json();
}

function toast(msg, type='ok') {
    const t = document.getElementById('toast');
    document.getElementById('toastIcon').textContent = type==='ok' ? '✅' : '❌';
    document.getElementById('toastText').textContent = msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 3500);
}

function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('eduTheme', document.body.classList.contains('light')?'light':'dark');
}
if (localStorage.getItem('eduTheme')==='light') document.body.classList.add('light');


async function init() {
    document.getElementById('pageDate').textContent =
        new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    try {
        const user = await api('me.php');
        if (!user || user.error) { window.location.href='index.html'; return; }

        currentEleveId = user.eleve_id;
        const initials = ((user.prenom||'?')[0]+(user.nom||'?')[0]).toUpperCase();
        document.getElementById('sidebarInitials').textContent = initials;
        document.getElementById('sidebarNom').textContent = `${user.prenom} ${user.nom}`;
        document.getElementById('sidebarClasse').textContent = user.classe_nom || 'Élève';
        document.getElementById('user-welcome').textContent = user.prenom;
        document.getElementById('user-class').textContent = `Classe : ${user.classe_nom||'Non assignée'}`;

        await loadNotes(currentEleveId, 1);
        document.getElementById('statDocs').textContent = getSharedDocs().length;
    } catch(e) { console.error('Init:', e); }
}


function changerTrimestre() {
    const trim = document.getElementById('selectTrimestre').value;
    if (currentEleveId) loadNotes(currentEleveId, trim);
}

async function loadNotes(eleveId, trimestre=1) {
    const c = document.getElementById('notesContainer');
    c.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text3)">Chargement...</p>';
    try {
        const res = await api(`notes.php?eleve_id=${eleveId}&trimestre=${trimestre}`);
        if (!res || !res.par_matiere || !res.par_matiere.length) {
            c.innerHTML = `<p style="text-align:center;padding:30px;color:var(--text3)">Aucune note pour le trimestre ${trimestre}.</p>`;
            if (trimestre==1) { cachedMatieres=[]; renderMatiereList([]); }
            document.getElementById('statMatieres').textContent='0';
            document.getElementById('statMoyenne').textContent='—';
            return;
        }

        if (trimestre==1) {
            cachedMatieres = res.par_matiere;
            renderMatiereList(cachedMatieres);
        }

        document.getElementById('statMatieres').textContent = res.par_matiere.length;

        let pts=0, coef=0;
        res.par_matiere.forEach(m => {
            if (m.moyenne!==null) { pts+=m.moyenne*(m.coefficient||1); coef+=(m.coefficient||1); }
        });
        document.getElementById('statMoyenne').textContent = coef>0 ? (pts/coef).toFixed(2) : '—';

        const matCols=['rgba(168,218,255,.1)','rgba(255,166,213,.1)','rgba(184,168,255,.1)','rgba(168,255,218,.1)','rgba(255,210,128,.1)'];

        const nb = v => {
            if (v===null||v===undefined) return `<span class="nb nb-empty">—</span>`;
            const cl = v>=14?'nb-good':v>=10?'nb-avg':'nb-bad';
            return `<span class="nb ${cl}">${v}</span>`;
        };

        let html = `<table class="notes-table"><thead><tr>
            <th style="text-align:left">Matière</th>
            <th>DS 1</th><th>DS 2</th><th>DM / TP</th><th>Moyenne</th>
        </tr></thead><tbody>`;

        res.par_matiere.forEach((m,i) => {
            const moy = m.moyenne;
            const moyCl = moy===null?'nb-empty':moy>=14?'nb-good':moy>=10?'nb-avg':'nb-bad';
            const dmTp = m.dm!==null ? m.dm : m.tp;
            html += `<tr>
                <td>
                    <span style="width:32px;height:32px;border-radius:9px;background:${matCols[i%5]};display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:8px;vertical-align:middle">${m.icone||'📚'}</span>
                    <span style="font-weight:600">${m.matiere}</span>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px;padding-left:40px">${m.prof||''}</div>
                </td>
                <td>${nb(m.ds1)}</td>
                <td>${nb(m.ds2)}</td>
                <td>${nb(dmTp)}</td>
                <td><span class="nb ${moyCl}" style="font-size:14px">${moy!==null?moy:'—'}</span></td>
            </tr>`;
        });

        c.innerHTML = html + '</tbody></table>';
    } catch(e) {
        c.innerHTML = `<p style="color:#ff6b6b;text-align:center">Erreur de chargement.</p>`;
    }
}

function renderMatiereList(matieres) {
    const list = document.getElementById('matiereList');
    if (!matieres.length) { list.innerHTML='<p style="color:var(--text3);font-size:13px">Aucune matière.</p>'; return; }
    const cols=['rgba(168,218,255,.15)','rgba(255,166,213,.15)','rgba(184,168,255,.15)','rgba(168,255,218,.15)','rgba(255,210,128,.15)'];
    list.innerHTML = matieres.map((m,i)=>`
        <div class="matiere-item">
            <div class="mat-icon-w" style="background:${cols[i%5]}">${m.icone||'📚'}</div>
            <div>
                <div style="font-size:13.5px;font-weight:600;color:var(--text)">${m.matiere}</div>
                <div style="font-size:11.5px;color:var(--text3)">👨‍🏫 ${m.prof||'—'}</div>
            </div>
            <div class="mat-coef">Coef. ${m.coefficient||1}</div>
        </div>`).join('');
}


async function loadAbsences() {
    const c = document.getElementById('absencesContainer');
    c.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text3)">Chargement...</p>';
    try {
        const abs = await api('absences.php');
        if (!abs || abs.error || !abs.length) {
            c.innerHTML = `<div style="text-align:center;padding:50px;color:var(--text3)">
                <div style="font-size:48px;margin-bottom:14px">🎉</div>
                <div style="font-size:14px;font-weight:600;color:var(--text2)">Aucune absence enregistrée !</div>
            </div>`;
            return;
        }

     
        const total   = abs.length;
        const absents = abs.filter(a => a.type_absence === 'Absent').length;
        const retards = abs.filter(a => a.type_absence === 'Retard').length;

     
        let html = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px">
                <div style="background:rgba(168,255,218,.08);border:1px solid rgba(95,207,160,.2);border-radius:14px;padding:18px;text-align:center">
                    <div style="font-family:'Sora',sans-serif;font-size:26px;font-weight:800;color:#5fcfa0">${absents}</div>
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:4px">Absence(s)</div>
                </div>
                <div style="background:rgba(255,210,128,.08);border:1px solid rgba(245,167,66,.2);border-radius:14px;padding:18px;text-align:center">
                    <div style="font-family:'Sora',sans-serif;font-size:26px;font-weight:800;color:#f5a742">${retards}</div>
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:4px">Retard(s)</div>
                </div>
                <div style="background:rgba(168,218,255,.08);border:1px solid rgba(126,200,255,.2);border-radius:14px;padding:18px;text-align:center">
                    <div style="font-family:'Sora',sans-serif;font-size:26px;font-weight:800;color:#7ec8ff">${total}</div>
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:4px">Total</div>
                </div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:12px">Historique des absences &amp; retards</div>
            <div style="display:flex;flex-direction:column;gap:10px">
        `;

        abs.forEach(a => {
            const dateF = new Date(a.date_absence).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
            const hDebut = (a.heure_debut||'').substring(0,5);
            const hFin   = (a.heure_fin||'').substring(0,5);
            const creneau = hDebut && hFin ? `${hDebut}h – ${hFin}h` : '';

            const isAbsent = a.type_absence === 'Absent';
            const isRetard = a.type_absence === 'Retard';
            const dotColor = isAbsent ? '#ff6b6b' : isRetard ? '#f5a742' : '#5fcfa0';
            const typeLabel = isAbsent
                ? '<span style="font-weight:700;color:#ff6b6b">Absent(e)</span>'
                : isRetard
                    ? '<span style="font-weight:700;color:#f5a742">Retard</span>'
                    : '<span style="font-weight:700;color:#5fcfa0">Présent(e)</span>';

            const justBadge = a.justifiee
                ? '<span style="padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(168,255,218,.15);color:#5fcfa0;border:1px solid rgba(95,207,160,.25)">Justifiée</span>'
                : '<span style="padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(255,107,107,.15);color:#ff6b6b;border:1px solid rgba(255,107,107,.25)">Injustifiée</span>';

            const matInfo = a.matiere_nom
                ? `<span style="font-size:11.5px;color:var(--text3)">🗂 ${a.matiere_nom}${a.prof_nom ? ' · ' + a.prof_nom : ''}</span>`
                : '';

            html += `
                <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px">
                    <div style="width:10px;height:10px;border-radius:50%;background:${dotColor};flex-shrink:0;box-shadow:0 0 8px ${dotColor}66"></div>
                    <div style="flex:1">
                        <div style="font-size:13px;font-weight:600;color:var(--text)">${dateF}${creneau ? ' · ' + creneau : ''}</div>
                        <div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">${matInfo}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:9px;flex-shrink:0">
                        ${typeLabel}
                        ${justBadge}
                    </div>
                </div>
            `;
        });

      
        html += `</div>
            <div style="margin-top:18px;padding:13px 16px;background:rgba(168,218,255,.07);border:1px solid var(--border);border-radius:12px;font-size:12.5px;color:var(--text3);display:flex;gap:9px;align-items:flex-start">
                <span>ℹ️</span>
                <span>Pour justifier une absence, rapportez un certificat médical ou un justificatif écrit de vos parents à votre professeur principal ou au secrétariat du lycée.</span>
            </div>
        `;

        c.innerHTML = html;
    } catch(e) {
        c.innerHTML = `<p style="color:#ff6b6b;text-align:center">Erreur de chargement.</p>`;
    }
}


async function loadEdt() {
    const container = document.getElementById('edtContent');
    container.innerHTML = '<p style="text-align:center;padding:30px;color:var(--text3)">Chargement...</p>';

    const edt = await api('edt.php');
    if (!edt || edt.error || !Array.isArray(edt) || !edt.length) {
        container.innerHTML = `<p style="text-align:center;padding:30px;color:var(--text3)">${edt?.error||'Aucun cours trouvé.'}</p>`;
        return;
    }

    const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"];

   
    const HD  = 8*60;       
    const P1S = 10*60;      
    const P1E = 10*60+10;   
    const P2S = 12*60;      
    const P2E = 13*60+30;   
    const HF  = 17*60;      
    const PPM = 1.8;        

    function toMin(s) {
        if (!s) return 0;
        const p = s.split(':');
        return parseInt(p[0]||0)*60 + parseInt(p[1]||0);
    }

    function m2px(m) {
        if (m <= HD) return 0;
        let e = 0;
        e += Math.min(m, P1S) - HD;
        if (m <= P1E) return e * PPM;
        e += Math.min(m, P2S) - P1E;
        if (m <= P2E) return e * PPM;
        e += Math.min(m, HF) - P2E;
        return e * PPM;
    }

    const totalH = m2px(HF);

    const labels = [
        {m:HD, t:'08:00'},{m:9*60, t:'09:00'},
        {m:P1S, t:'10:00'},{m:P1E, t:'10:10'},
        {m:11*60, t:'11:00'},{m:P2S, t:'12:00'},
        {m:P2E, t:'13:30'},{m:14*60,t:'14:00'},
        {m:15*60, t:'15:00'},{m:16*60,t:'16:00'},
        {m:HF, t:'17:00'}
    ];

    const colors = [
        {bg:'rgba(168,218,255,.18)',br:'#7ec8ff'},
        {bg:'rgba(255,166,213,.18)',br:'#ff85c1'},
        {bg:'rgba(184,168,255,.18)',br:'#9d88ff'},
        {bg:'rgba(168,255,218,.18)',br:'#5fcfa0'},
        {bg:'rgba(255,210,128,.18)',br:'#f5a742'},
    ];

    const TW=54, CW=148, GAP=5;

    let html = `<div style="overflow-x:auto;padding-bottom:10px">
    <div style="display:flex;min-width:${TW+jours.length*(CW+GAP)}px">

      <div style="width:${TW}px;flex-shrink:0;position:relative;height:${totalH+46}px;margin-top:46px">
        ${labels.map(l=>`
          <div style="position:absolute;top:${m2px(l.m)}px;right:8px;transform:translateY(-50%);font-size:9.5px;color:var(--text3);font-weight:600;white-space:nowrap">${l.t}</div>
          <div style="position:absolute;top:${m2px(l.m)}px;right:2px;width:5px;height:1px;background:var(--text3);opacity:.2"></div>
        `).join('')}
      </div>

      ${jours.map(jour=>{
        // Filtrage des cours par nom de jour
        const cj = edt.filter(c=>c.jour.toLowerCase() === jour.toLowerCase());
        return `
        <div style="flex:0 0 ${CW}px;margin-right:${GAP}px">
          <div style="height:46px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--pink);font-size:12px;border-bottom:1px solid var(--border)">${jour}</div>
          <div style="position:relative;height:${totalH}px;background:rgba(255,255,255,.015);border-radius:0 0 10px 10px;overflow:visible">
            ${labels.map(l=>`<div style="position:absolute;top:${m2px(l.m)}px;left:0;right:0;height:1px;background:var(--border);opacity:.35;pointer-events:none"></div>`).join('')}
            
            <div style="position:absolute;top:${m2px(P1S)}px;left:0;right:0;height:${m2px(P1E)-m2px(P1S)}px;background:repeating-linear-gradient(45deg,rgba(255,166,213,.06),rgba(255,166,213,.06) 3px,transparent 3px,transparent 9px);border-top:1px dashed rgba(255,166,213,.35);border-bottom:1px dashed rgba(255,166,213,.35);z-index:0;display:flex;align-items:center">
              <span style="font-size:8px;color:rgba(255,166,213,.85);padding:0 5px;font-weight:700;letter-spacing:.5px">PAUSE</span>
            </div>

            <div style="position:absolute;top:${m2px(P2S)}px;left:0;right:0;height:${m2px(P2E)-m2px(P2S)}px;background:repeating-linear-gradient(45deg,rgba(168,218,255,.06),rgba(168,218,255,.06) 3px,transparent 3px,transparent 9px);border-top:1px dashed rgba(168,218,255,.35);border-bottom:1px dashed rgba(168,218,255,.35);z-index:0;display:flex;align-items:center">
              <span style="font-size:8px;color:rgba(168,218,255,.85);padding:0 5px;font-weight:700;letter-spacing:.5px">DÉJEUNER</span>
            </div>

            ${(() => {
                const valid = cj.map(c => {
                    const deb=toMin(c.heure_debut), fin=toMin(c.heure_fin);
                    if (isNaN(deb)||isNaN(fin)||deb>=fin||deb<HD||fin>HF) return null;
                    const top=m2px(deb), h=m2px(fin)-top;
                    return {...c, deb, fin, top, h};
                }).filter(Boolean);

                // ... (le reste de la logique de calcul des slots/chevauchements reste identique)
                // [Gardez votre code de calcul des slots ici]
                return valid.map((c, i) => { 
                    /* Votre code de rendu HTML du cours */ 
                    const th=colors[c.id%colors.length];
                    return `<div style="position:absolute;top:${c.top+2}px;left:3px;width:calc(100% - 6px);height:${c.h-4}px;background:${th.bg};border-left:3px solid ${th.br};border-radius:7px;padding:5px 7px;overflow:hidden;z-index:2;">
                        <div style="font-weight:700;color:#fff;font-size:11px;">${c.matiere_nom}</div>
                        <div style="color:rgba(255,255,255,.6);font-size:9.5px;">${c.heure_debut.substring(0,5)}–${c.heure_fin.substring(0,5)}</div>
                    </div>`;
                }).join('');
            })()}
          </div>
        </div>`;
      }).join('')}
    </div></div>`;

    container.innerHTML = html;
}


function getSharedDocs() {
    try { return JSON.parse(localStorage.getItem('edulycee_docs')||'[]'); }
    catch { return []; }
}

async function loadCours() {
    const grid    = document.getElementById('coursMatieresGrid');
    const docList = document.getElementById('coursDocsList');
    docList.innerHTML = '';

    let matieres = cachedMatieres;
    if (!matieres.length && currentEleveId) {
        const r = await api(`notes.php?eleve_id=${currentEleveId}&trimestre=1`);
        matieres = (r && r.par_matiere) ? r.par_matiere : [];
        cachedMatieres = matieres;
    }

    if (!matieres.length) {
        grid.innerHTML='<p style="color:var(--text3);font-size:13px;grid-column:1/-1">Aucune matière trouvée.</p>';
        return;
    }

    const allDocs   = getSharedDocs();
    const matCols   = ['rgba(168,218,255,.15)','rgba(255,166,213,.15)','rgba(184,168,255,.15)','rgba(168,255,218,.15)','rgba(255,210,128,.15)'];
    const matBords  = ['#7ec8ff','#ff85c1','#9d88ff','#5fcfa0','#f5a742'];

    grid.innerHTML = matieres.map((m,i)=>{
        const ci  = i%5;
        const cnt = allDocs.filter(d=>d.matiere_nom===m.matiere).length;
        return `<div class="mat-card" onclick="showDocsMat('${m.matiere.replace(/'/g,"\\'")}',${i})"
            style="border-color:${matBords[ci]}">
            <div style="font-size:30px;margin-bottom:10px">${m.icone||'📚'}</div>
            <div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:4px">${m.matiere}</div>
            <div style="font-size:11px;color:var(--text3)">${m.prof||'—'}</div>
            <div class="mc-badge" style="background:rgba(255,255,255,.07);color:${matBords[ci]}">${cnt} doc${cnt!==1?'s':''}</div>
        </div>`;
    }).join('');

    document.getElementById('statDocs').textContent = allDocs.length;
}

function showDocsMat(nom, idx) {
    const docList  = document.getElementById('coursDocsList');
    const docs     = getSharedDocs().filter(d=>d.matiere_nom===nom);
    const matBords = ['#7ec8ff','#ff85c1','#9d88ff','#5fcfa0','#f5a742'];
    const color    = matBords[idx%5];
    const typeEmoji= {Cours:'📚',Exercice:'📝',Corrige:'✅',Autre:'📎'};

    document.querySelectorAll('.mat-card').forEach((el,i)=>{
        el.style.boxShadow = i===idx ? `0 0 0 2px ${color},0 12px 30px rgba(0,0,0,.25)` : '';
        el.style.transform = i===idx ? 'translateY(-5px)' : '';
    });

    if (!docs.length) {
        docList.innerHTML = `<div style="border:1.5px dashed var(--border);border-radius:14px;padding:44px;text-align:center;color:var(--text3)">
            <div style="font-size:42px;margin-bottom:12px">📭</div>
            <div style="font-size:14px;font-weight:600;color:var(--text2)">Aucun document pour <b>${nom}</b></div>
            <div style="font-size:12px;margin-top:6px">Votre professeur n'a pas encore partagé de fichiers.</div>
        </div>`;
        return;
    }

    docList.innerHTML = `
        <div style="font-weight:700;font-size:14px;color:${color};margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">
            📂 Documents — ${nom}
        </div>
        ${docs.map(d=>`
        <div class="doc-item" onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--border)'">
            <div class="doc-icon">${typeEmoji[d.type]||'📄'}</div>
            <div style="flex:1">
                <div class="doc-title">${d.titre}</div>
                <div class="doc-sub">${d.type} · ${d.classe_nom||''} · ${new Date(d.date||Date.now()).toLocaleDateString('fr-FR')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                <span class="badge-avail">Disponible</span>
                ${d.fileData?`<button class="btn-dl" onclick="telechargerDoc('${d.fileName}','${d.fileData}')">⬇️ PDF</button>`:''}
            </div>
        </div>`).join('')}`;
}

function telechargerDoc(nom, data) {
    const a = document.createElement('a');
    a.href = data; a.download = nom; a.click();
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
    await fetch('api/login.php?action=logout',{method:'POST'}).catch(()=>{});
    sessionStorage.removeItem('edulycee_user');
    window.location.href='index.html';
}


window.onload = init;

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
        if (!me || me.error) { list.innerHTML = '<p style="padding:16px;color:var(--text3);font-size:13px">Impossible de charger les canaux.</p>'; return; }

        MSG.myId   = me.user_id || me.id || me.eleve_id;
        MSG.myRole = me.role;

        MSG.channels = [];

        if (me.role === 'eleve') {
            const edt = await api('edt.php');
            const seenMatieres = new Set();
            if (Array.isArray(edt)) {
                edt.forEach(cours => {
                    const mid = cours.matiere_id || 0;
                    if (!mid || seenMatieres.has(mid)) return;
                    seenMatieres.add(mid);
                    MSG.channels.push({
                        matiere_id:  mid,
                        matiere_nom: cours.matiere_nom || cours.matiere || 'Cours',
                        icone:       cours.icone || '📚',
                      
classe_id: cours.classe_id || me.classe_id,
                      
classe_nom:  cours.classe_nom || me.classe_nom || 'Votre classe',
                        prof:        cours.prof_nom || cours.prof || ''
                    });
                });
            }
           
            if (!MSG.channels.length) {
                const notes = await api(`notes.php?eleve_id=${me.eleve_id}&trimestre=1`);
                const matieres = (notes && notes.par_matiere) ? notes.par_matiere : [];
                matieres.forEach(m => {
                    const mid = m.matiere_id || m.id || 0;
                    if (!mid) return;
                    MSG.channels.push({
                        matiere_id:  mid,
                        matiere_nom: m.matiere,
                        icone:       m.icone || '📚',
                        classe_id:   me.classe_id,
                        classe_nom:  me.classe_nom || 'Votre classe',
                        prof:        m.prof || ''
                    });
                });
            }
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

        console.log('MSG.myId =', MSG.myId, '| canaux =', MSG.channels);
        msgRenderChannels();
    } catch(e) {
        console.error('msgLoadChannels:', e);
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
    console.log('msgFetch:', url);
    try {
        const data = await api(url);
        console.log('msgFetch réponse:', data);
        MSG.messages = Array.isArray(data) ? data : [];
        MSG.lastId = MSG.messages.length ? MSG.messages[MSG.messages.length-1].id : 0;
        msgRenderMessages(true);
    } catch(e) { console.error('msgFetch erreur:', e); }
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
        console.log('msgSend → canal:', ch);
     const res = await api('messages.php', 'POST', {
    classe_id:  ch.classe_id,
    matiere_id: ch.matiere_id,
    contenu
});
        console.log('msgSend réponse:', res);
        if (res && res.success && res.message) {
            MSG.messages.push(res.message);
        MSG.lastId = res.message.id;
            msgRenderMessages(true);
        }
    } catch(e) { console.error('msgSend erreur:', e); }

    btn.disabled = false;
    inp.focus();
}

async function msgDelete(id) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
        await api(`messages.php?id=${id}`, 'DELETE');  
        MSG.messages = MSG.messages.filter(m => m.id != id);
        msgRenderMessages(false);
    } catch(e) {}
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
