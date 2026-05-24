let selectedRole = 'professeur';
const roleTitles = { 
    professeur: '👩‍🏫 Connexion Professeur', 
    eleve: '🎒 Connexion Élève', 
    directeur: '🏫 Connexion Directeur' 
};

function selectRole(r) {
    selectedRole = r;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('role-' + r).classList.add('active');
    document.getElementById('formTitle').textContent = roleTitles[r];
    clearErrors();
}


function clearErrors() {
    ['username', 'password'].forEach(id => {
        document.getElementById(id).classList.remove('err');
        document.getElementById(id + 'Err').classList.remove('show');
    });
    document.getElementById('alertErr').classList.remove('show');
    document.getElementById('alertOk').classList.remove('show');
}

function showAlert(msg, type = 'err') {
    const el = document.getElementById('alert' + type.charAt(0).toUpperCase() + type.slice(1));
    el.textContent = (type === 'err' ? '❌ ' : '✅ ') + msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
}

async function doLogin(e) {
    e.preventDefault();
    clearErrors();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    let ok = true;

    if (!username) { 
        document.getElementById('username').classList.add('err'); 
        document.getElementById('usernameErr').classList.add('show'); 
        ok = false; 
    }
    if (!password) { 
        document.getElementById('password').classList.add('err'); 
        document.getElementById('passwordErr').classList.add('show'); 
        ok = false; 
    }
    
    if (!ok) return;

    const btn = document.getElementById('loginBtn');
    btn.disabled = true; 
    btn.classList.add('loading');

    try {
        const res = await fetch('api/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            
            if (data.user.role !== selectedRole) {
                showAlert(`Ce compte est un compte "${data.user.role}", pas "${selectedRole}".`);
                btn.disabled = false; 
                btn.classList.remove('loading');
                return;
            }
            
            showAlert('Connexion réussie ! Redirection…', 'Ok');
            
         
            sessionStorage.setItem('edulycee_user', JSON.stringify(data.user));
            setTimeout(() => { window.location.href = data.user.redirectTo; }, 1000);
            
        } else {
            showAlert(data.error || 'Identifiant ou mot de passe incorrect');
            btn.disabled = false; 
            btn.classList.remove('loading');
        }
    } catch (err) {
        showAlert('Erreur de connexion au serveur. Vérifiez que XAMPP est démarré.');
        btn.disabled = false; 
        btn.classList.remove('loading');
    }
}


function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('eduTheme', document.body.classList.contains('light') ? 'light' : 'dark');
}

if (localStorage.getItem('eduTheme') === 'light') {
    document.body.classList.add('light');
}