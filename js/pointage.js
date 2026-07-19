// ===== POINTAGE =====
function handlePointageSuccess(type, data) {
  const now = new Date();
  const heureStr = now.toLocaleTimeString('fr-MA', { hour:'2-digit', minute:'2-digit' });
  const message = data && data.message ? data.message : (data && data.data && data.data.statut ? data.data.statut : 'Pointé');
  const statut = message || 'Pointé';
  const isLate = statut.toLowerCase().includes('retard');
  const isWrongPlace = statut.toLowerCase().includes('mauvais');
  const isEarly = statut.toLowerCase().includes('anticipé');

  if (type === 'entree') {
    state = { ...state, hasEntree: true, heureEntreeStr: heureStr };
    document.getElementById('btn-entree').classList.add('disabled');
    document.getElementById('btn-sortie').classList.remove('disabled');
    updateStatusBanner('present',
      isLate ? '⚠ ' + statut : isWrongPlace ? '📍 ' + statut : '✅ En poste',
      'Entrée à ' + heureStr, isLate ? 'red' : 'green');
    addHistory('in', type, heureStr, statut);
    showToast(isWrongPlace ? 'error' : isLate ? 'warning' : 'success', statut, 'Entrée enregistrée');
  } else {
    state = { ...state, hasSortie: true };
    document.getElementById('btn-sortie').classList.add('disabled');
    const heures = (data && data.data && data.data.heuresTravaillees) || '—';
    updateStatusBanner('absent',
      isEarly ? '⚠ Sortie anticipée' : '✅ Journée terminée',
      'Sortie à ' + heureStr + ' · ' + heures + 'h travaillées', isEarly ? 'red' : 'green');
    addHistory('out', type, heureStr, statut);
    showToast(isEarly ? 'warning' : 'success', 'Terminé', 'Bonne fin de journée');
  }
  saveHistory();
}

async function doPointage(type) {
  if (!state.gpsReady) {
    showToast('error', 'GPS non disponible', 'Vérifiez les permissions.');
    return;
  }

  const bioEnabled = document.getElementById('bio-toggle').checked;

  if (!bioEnabled) {
    showLoading('Enregistrement...', 'Pointage en cours');
    const webhookUrl = type === 'entree' ? CONFIG.webhooks.entree : CONFIG.webhooks.sortie;
    const data = await apiCall(webhookUrl, {
      employeeId: state.employeeId,
      nom: state.nom,
      type: type,
      latitude: state.gpsLat,
      longitude: state.gpsLng,
      timestamp: new Date().toISOString(),
      heureEntreeStr: state.heureEntreeStr,
      biometricsVerified: false,
      biometricsMethod: "none"
    });
    hideLoading();
    if (data.success === false && data.error) {
      showToast('error', 'Erreur', data.error);
    } else {
      handlePointageSuccess(type, data);
    }
    return;
  }

  const bioOk = await verifyBiometrics(type, {});
  if (!bioOk) return;
}

// ===== HISTORY =====
function addHistory(iconType, type, heure, statut) {
  const item = { iconType, type, heure, statut, date: new Date().toLocaleDateString('fr-MA') };
  state = { ...state, history: [item, ...state.history] };
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  if (!state.history.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:24px;color:var(--muted);font-size:13px';
    empty.textContent = 'Aucun pointage enregistré';
    list.appendChild(empty);
    return;
  }
  state.history.slice(0, 5).forEach(h => {
    const isLate = h.statut.toLowerCase().includes('retard');
    const isEarly = h.statut.toLowerCase().includes('anticipé') || h.statut.toLowerCase().includes('avant');
    const isOk = !isLate && !isEarly && !h.statut.toLowerCase().includes('mauvais');
    const badgeClass = isOk ? 'badge-ok' : isLate ? 'badge-late' : 'badge-early';

    const item = document.createElement('div');
    item.className = 'history-item';

    const icon = document.createElement('div');
    icon.className = 'history-icon ' + h.iconType;
    icon.textContent = h.iconType === 'in' ? '↗' : '↙';

    const textWrap = document.createElement('div');
    textWrap.className = 'history-text';

    const ht = document.createElement('div');
    ht.className = 'ht';
    ht.textContent = (h.type === 'entree' ? 'Entrée' : 'Sortie') + ' — ' + h.heure;

    const hs = document.createElement('div');
    hs.className = 'hs';
    hs.textContent = h.date;

    textWrap.appendChild(ht);
    textWrap.appendChild(hs);

    const badge = document.createElement('span');
    badge.className = 'history-badge ' + badgeClass;
    badge.textContent = h.statut;

    item.appendChild(icon);
    item.appendChild(textWrap);
    item.appendChild(badge);
    list.appendChild(item);
  });
}

function saveHistory() {
  localStorage.setItem('piq_history_' + state.employeeId, JSON.stringify(state.history));
}

function loadHistory() {
  document.getElementById('btn-entree').classList.remove('disabled');
  document.getElementById('btn-sortie').classList.add('disabled');
  updateStatusBanner('absent', 'Non pointé', "Aucune activité aujourd'hui");

  const saved = localStorage.getItem('piq_history_' + state.employeeId);
  let history = saved ? JSON.parse(saved) : [];
  const today = new Date().toLocaleDateString('fr-MA');
  history = history.filter(h => h.date === today);

  const entree = history.find(h => h.type === 'entree');
  const sortie = history.find(h => h.type === 'sortie');

  let hasEntree = false, hasSortie = false, heureEntreeStr = null;

  if (entree) {
    hasEntree = true;
    heureEntreeStr = entree.heure;
    document.getElementById('btn-entree').classList.add('disabled');
    document.getElementById('btn-sortie').classList.remove('disabled');
    updateStatusBanner('present', '✅ En poste', 'Entrée à ' + entree.heure, 'green');
  }
  if (sortie) {
    hasSortie = true;
    document.getElementById('btn-sortie').classList.add('disabled');
    updateStatusBanner('absent', '✅ Journée terminée', 'Sortie à ' + sortie.heure, 'green');
  }

  state = { ...state, history, hasEntree, hasSortie, heureEntreeStr };
  renderHistory();
}
