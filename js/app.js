let state = {
  employeeId: '', nom: '',
  gpsLat: null, gpsLng: null, gpsReady: false,
  hasEntree: false, hasSortie: false,
  heureEntreeStr: null, history: [],
  bioRegistered: false, bioMethod: null
};

// ===== API HELPERS =====
async function apiCall(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Erreur réseau. Réessayez.' };
  }
}

// ===== INPUT VALIDATION =====
function validateInput(id, nom) {
  const v = CONFIG.validation;
  const errors = [];

  if (!id || id.length < v.idMinLen || id.length > v.idMaxLen) {
    errors.push('ID doit faire entre ' + v.idMinLen + ' et ' + v.idMaxLen + ' caractères');
  } else if (!v.idPattern.test(id)) {
    errors.push('ID ne peut contenir que lettres, chiffres, tirets ou underscores');
  }

  if (!nom || nom.length < v.nomMinLen || nom.length > v.nomMaxLen) {
    errors.push('Le nom doit faire entre ' + v.nomMinLen + ' et ' + v.nomMaxLen + ' caractères');
  } else if (!v.nomPattern.test(nom)) {
    errors.push('Le nom ne peut contenir que des lettres, espaces, tirets ou apostrophes');
  }

  return errors;
}

// ===== UI HELPERS =====
function showLoading(text, sub) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-sub').textContent = sub;
  document.getElementById('loading-overlay').classList.add('show');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('show');
}

function showToast(type, title, msg) {
  const t = document.getElementById('toast');
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  document.getElementById('toast-icon').textContent = icons[type] || '•';
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 4000);
}
let toastTimer = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateStatusBanner(dotClass, value, sub, colorClass) {
  document.getElementById('status-icon').className = 'status-dot ' + dotClass;
  const v = document.getElementById('status-value');
  v.textContent = value;
  v.className = 'value ' + (colorClass || '');
  document.getElementById('status-sub').textContent = sub;
}

// ===== LOGIN / LOGOUT =====
async function doLogin() {
  const id = document.getElementById('input-id').value.trim();
  const nom = document.getElementById('input-nom').value.trim();

  const errors = validateInput(id, nom);
  if (errors.length) {
    showToast('error', 'Champs invalides', errors[0]);
    return;
  }

  state = { ...state, employeeId: id, nom: nom };
  localStorage.setItem('piq_id', id);
  localStorage.setItem('piq_nom', nom);
  const bioToggle = document.getElementById('bio-toggle');
  const savedBio = localStorage.getItem('piq_bio_' + id);
  bioToggle.checked = savedBio === 'on';
  bioToggle.addEventListener('change', () => {
    localStorage.setItem('piq_bio_' + state.employeeId, bioToggle.checked ? 'on' : 'off');
  });
  document.getElementById('topbar-sub').textContent = 'Bonjour, ' + nom.split(' ')[0];
  document.getElementById('topbar-avatar').textContent = nom.charAt(0).toUpperCase();
  showScreen('screen-main');
  startGPS();
  loadHistory();

  if (bioToggle.checked) {
    showLoading('Vérification du statut...', 'Connexion au serveur');
    await checkBioStatus();
    hideLoading();
  }
}

function doLogout() {
  localStorage.removeItem('piq_id');
  localStorage.removeItem('piq_nom');
  state = { employeeId:'', nom:'', gpsLat:null, gpsLng:null, gpsReady:false, hasEntree:false, hasSortie:false, heureEntreeStr:null, history:[], bioRegistered:false, bioMethod:null };
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  const empty = document.createElement('div');
  empty.style.cssText = 'text-align:center;padding:24px;color:var(--muted);font-size:13px';
  empty.textContent = 'Aucun pointage enregistré';
  list.appendChild(empty);
  updateStatusBanner('absent', 'Non pointé', "Aucune activité aujourd'hui");
  document.getElementById('btn-entree').classList.remove('disabled');
  document.getElementById('btn-sortie').classList.add('disabled');
  document.getElementById('bio-status-badge').className = 'bio-badge';
  document.getElementById('bio-status-badge').textContent = '🔒 Visage';
  document.getElementById('input-id').value = '';
  document.getElementById('input-nom').value = '';
  showScreen('screen-login');
}

// ===== RIPPLE EFFECT =====
document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const r = document.createElement('span');
    r.classList.add('ripple');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    this.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });
});

// ===== EVENT LISTENERS =====
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('btn-logout').addEventListener('click', doLogout);
document.getElementById('btn-entree').addEventListener('click', () => doPointage('entree'));
document.getElementById('btn-sortie').addEventListener('click', () => doPointage('sortie'));

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  const id = localStorage.getItem('piq_id');
  const nom = localStorage.getItem('piq_nom');
  if (id && nom) {
    document.getElementById('input-id').value = id;
    document.getElementById('input-nom').value = nom;
    state = { ...state, employeeId: id, nom: nom };
    document.getElementById('topbar-sub').textContent = 'Bonjour, ' + nom.split(' ')[0];
    document.getElementById('topbar-avatar').textContent = nom.charAt(0).toUpperCase();
    const bioToggle = document.getElementById('bio-toggle');
    const savedBio = localStorage.getItem('piq_bio_' + id);
    bioToggle.checked = savedBio === 'on';
    bioToggle.addEventListener('change', () => {
      localStorage.setItem('piq_bio_' + state.employeeId, bioToggle.checked ? 'on' : 'off');
    });
    showScreen('screen-main');
    startGPS();
    loadHistory();
    if (bioToggle.checked) {
      showLoading('Vérification...', 'Connexion au serveur');
      checkBioStatus().then(() => hideLoading());
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('screen-login').classList.contains('active')) doLogin();
});
