// ===== BIOMÉTRIE (WebAuthn + Selfie Fallback) =====

// --- Base64url helpers (WebAuthn) ---
function base64urlToBytes(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function bytesToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- WebAuthn support detection ---
function isWebAuthnSupported() {
  return window.PublicKeyCredential !== undefined;
}

// --- Badge ---
async function checkBioStatus() {
  if (isWebAuthnSupported()) {
    const data = await apiCall(CONFIG.webhooks.bioChallenge, { employeeId: state.employeeId });
    state = { ...state, bioRegistered: data.success === true };
  } else {
    const data = await apiCall(CONFIG.webhooks.selfieVerify, { employeeId: state.employeeId, photo: 'check' });
    state = { ...state, bioRegistered: data.hasSelfie === true };
  }
  updateBioBadge();
  return state.bioRegistered;
}

function updateBioBadge() {
  const badge = document.getElementById('bio-status-badge');
  if (state.bioRegistered) {
    badge.className = 'bio-badge active';
    badge.textContent = isWebAuthnSupported() ? '🔒 Visage enregistré ✓' : '📸 Selfie enregistré ✓';
  } else {
    badge.className = 'bio-badge';
    badge.textContent = isWebAuthnSupported() ? '🔒 Visage requis' : '📸 Selfie requis';
  }
}

// ===== WEBAUTHN REGISTRATION =====
async function registerWebAuthn() {
  showLoading('Configuration du visage...', 'Connexion au serveur');
  const registerData = await apiCall(CONFIG.webhooks.bioRegister, {
    employeeId: state.employeeId,
    nom: state.nom,
    rpId: window.location.hostname
  });
  hideLoading();

  if (!registerData.challenge) {
    showToast('error', 'Erreur', registerData.error || 'Réponse serveur invalide pour le challenge.');
    return false;
  }

  showLoading('Scannez votre visage...', 'Enregistrement biométrique');
  try {
    const challengeBytes = base64urlToBytes(registerData.challenge);
    const userIdBytes = Uint8Array.from(state.employeeId, c => c.charCodeAt(0));

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: challengeBytes,
        rp: { id: registerData.rpId || window.location.hostname, name: 'PresenceIQ' },
        user: {
          id: userIdBytes,
          name: state.employeeId,
          displayName: state.nom
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        }
      }
    });
    hideLoading();

    const credentialId = bytesToBase64url(cred.rawId);
    const publicKeyCOSE = bytesToBase64url(cred.response.getPublicKey());
    const transports = cred.response.getTransports ? cred.response.getTransports() : ['internal'];

    const saveData = await apiCall(CONFIG.webhooks.bioSave, {
      employeeId: state.employeeId,
      credentialId,
      publicKey: publicKeyCOSE,
      transports: JSON.stringify(transports)
    });

    if (saveData.success) {
      state = { ...state, bioRegistered: true };
      updateBioBadge();
      showToast('success', '✅ Visage enregistré', 'Votre visage est lié à votre compte.');
      return true;
    }
    showToast('error', 'Erreur', 'Échec de la sauvegarde de la clé.');
    return false;
  } catch (e) {
    hideLoading();
    console.error("WebAuthn Registration Error:", e);
    showToast('error', 'Biométrie', 'Enregistrement du visage annulé ou échoué.');
    return false;
  }
}

// ===== WEBAUTHN VERIFICATION =====
async function verifyWebAuthn(pointageType) {
  showLoading('Vérification du visage...', 'Scannez votre visage');

  try {
    const challengeData = await apiCall(CONFIG.webhooks.bioChallenge, {
      employeeId: state.employeeId,
      rpId: window.location.hostname
    });

    if (!challengeData.success) {
      hideLoading();
      if (challengeData.error && challengeData.error.includes('aucune clé')) {
        state = { ...state, bioRegistered: false };
        updateBioBadge();
        showToast('warning', 'Visage non trouvé', 'Enregistrez votre visage d\'abord.');
        return await registerWebAuthn();
      }
      showToast('error', 'Erreur', challengeData.error || 'Échec du challenge');
      return false;
    }

    const challengeBytes = base64urlToBytes(challengeData.challenge);
    const credIdBytes = base64urlToBytes(challengeData.credentialId);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes,
        allowCredentials: [{
          type: 'public-key',
          id: credIdBytes,
          transports: challengeData.transports || ['internal']
        }],
        userVerification: "required"
      }
    });

    const clientDataJSON = bytesToBase64url(assertion.response.clientDataJSON);
    const authenticatorData = bytesToBase64url(assertion.response.authenticatorData);
    const signature = bytesToBase64url(assertion.response.signature);

    hideLoading();
    showLoading('Vérification...', 'Validation de votre identité');

    const verifyData = await apiCall(CONFIG.webhooks.bioVerify, {
      employeeId: state.employeeId,
      nom: state.nom,
      credentialId: challengeData.credentialId,
      clientDataJSON,
      authenticatorData,
      signature,
      challenge: challengeData.challenge,
      type: pointageType,
      latitude: state.gpsLat,
      longitude: state.gpsLng,
      timestamp: new Date().toISOString(),
      heureEntreeStr: state.heureEntreeStr,
      biometricsVerified: true,
      biometricsMethod: "WebAuthn"
    });
    hideLoading();

    if (verifyData.success && verifyData.verified) {
      handlePointageSuccess(pointageType, verifyData.forwardResponse || verifyData);
      return true;
    }
    showToast('error', '❌ Accès refusé', verifyData.error || 'Visage non reconnu');
    return false;
  } catch (e) {
    hideLoading();
    console.error("WebAuthn Verification Error:", e);
    showToast('error', 'Biométrie', 'Vérification annulée ou échouée.');
    return false;
  }
}

// ===== SELFIE FALLBACK =====
function captureSelfie() {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('selfie-modal');
    const video = document.getElementById('selfie-video');
    const canvas = document.getElementById('selfie-canvas');
    const btnCapture = document.getElementById('btn-selfie-capture');
    const btnClose = document.getElementById('btn-selfie-close');
    const status = document.getElementById('selfie-status');
    let stream = null;

    function cleanup() {
      if (stream) stream.getTracks().forEach(t => t.stop());
      modal.classList.remove('show');
      btnCapture.removeEventListener('click', onCapture);
      btnClose.removeEventListener('click', onClose);
    }

    function onClose() { cleanup(); reject(new Error('cancelled')); }

    async function onCapture() {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.85);
      cleanup();
      resolve(photo);
    }

    btnCapture.addEventListener('click', onCapture);
    btnClose.addEventListener('click', onClose);

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    }).then(s => {
      stream = s;
      video.srcObject = stream;
      video.play();
      modal.classList.add('show');
      status.textContent = 'Positionnez votre visage puis capturez';
    }).catch(err => {
      cleanup();
      reject(err);
    });
  });
}

async function registerSelfie() {
  try {
    showLoading('Ouverture caméra...', 'Préparez votre selfie');
    const photo = await captureSelfie();
    hideLoading();

    showLoading('Enregistrement...', 'Sauvegarde du selfie');
    const data = await apiCall(CONFIG.webhooks.selfieSave, {
      employeeId: state.employeeId,
      photo
    });
    hideLoading();

    if (data.success) {
      state = { ...state, bioRegistered: true };
      updateBioBadge();
      showToast('success', '📸 Selfie enregistré', 'Votre visage est lié à votre compte.');
      return true;
    }
    showToast('error', 'Erreur', data.error || 'Échec de l\'enregistrement');
    return false;
  } catch (e) {
    hideLoading();
    if (e.message === 'cancelled') {
      showToast('warning', 'Annulé', 'Capture selfie annulée.');
      return false;
    }
    console.error("Selfie Registration Error:", e);
    showToast('error', 'Caméra', 'Impossible d\'accéder à la caméra.');
    return false;
  }
}

async function verifySelfie(pointageType) {
  try {
    showLoading('Ouverture caméra...', 'Préparez votre selfie');
    const photo = await captureSelfie();
    hideLoading();

    showLoading('Vérification...', 'Comparaison avec votre selfie enregistré');
    const data = await apiCall(CONFIG.webhooks.selfieVerify, {
      employeeId: state.employeeId,
      photo
    });
    hideLoading();

    if (data.success && data.verified) {
      const fwd = await apiCall(
        pointageType === 'entree' ? CONFIG.webhooks.entree : CONFIG.webhooks.sortie,
        {
          employeeId: state.employeeId,
          nom: state.nom,
          type: pointageType,
          latitude: state.gpsLat,
          longitude: state.gpsLng,
          timestamp: new Date().toISOString(),
          heureEntreeStr: state.heureEntreeStr,
          biometricsVerified: true,
          biometricsMethod: "Selfie"
        }
      );
      handlePointageSuccess(pointageType, fwd);
      return true;
    }
    showToast('error', '❌ Accès refusé', data.error || 'Visage non reconnu');
    return false;
  } catch (e) {
    hideLoading();
    if (e.message === 'cancelled') {
      showToast('warning', 'Annulé', 'Capture selfie annulée.');
      return false;
    }
    console.error("Selfie Verification Error:", e);
    showToast('error', 'Caméra', 'Impossible d\'accéder à la caméra.');
    return false;
  }
}

// ===== MAIN TRIGGER (WebAuthn ou Selfie) =====
async function triggerBiometrics() {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    showToast('warning', 'HTTPS requis', 'Activez HTTPS pour utiliser la biométrie.');
    return false;
  }

  if (isWebAuthnSupported()) {
    return await registerWebAuthn();
  }
  return await registerSelfie();
}

async function verifyBiometrics(pointageType) {
  if (!state.bioRegistered) {
    const enrolled = await triggerBiometrics();
    if (!enrolled) return false;
  }

  if (isWebAuthnSupported()) {
    return await verifyWebAuthn(pointageType);
  }
  return await verifySelfie(pointageType);
}
