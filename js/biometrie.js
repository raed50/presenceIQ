// ===== BIOMÉTRIE (WebAuthn) =====

// Helpers base64url (WebAuthn utilise base64url, pas base64 standard)
function base64urlToBytes(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function bytesToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function checkBioStatus() {
  const data = await apiCall(CONFIG.webhooks.bioChallenge, { employeeId: state.employeeId });
  state = { ...state, bioRegistered: data.success === true };
  updateBioBadge();
  return state.bioRegistered;
}

function updateBioBadge() {
  const badge = document.getElementById('bio-status-badge');
  if (state.bioRegistered) {
    badge.className = 'bio-badge active';
    badge.textContent = '🔒 Visage enregistré ✓';
  } else {
    badge.className = 'bio-badge';
    badge.textContent = '🔓 Visage requis';
  }
}

async function triggerBiometrics() {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    showToast('warning', 'HTTPS requis', 'Activez HTTPS pour utiliser la biométrie.');
    return false;
  }

  if (!window.PublicKeyCredential) {
    showToast('warning', 'Non supporté', 'Votre navigateur ne supporte pas WebAuthn.');
    return false;
  }

  if (!state.bioRegistered) {
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
        credentialId: credentialId,
        publicKey: publicKeyCOSE,
        transports: JSON.stringify(transports)
      });

      if (saveData.success) {
        state = { ...state, bioRegistered: true };
        updateBioBadge();
        showToast('success', '✅ Visage enregistré', 'Votre visage est lié à votre compte.');
        return true;
      } else {
        showToast('error', 'Erreur', 'Échec de la sauvegarde de la clé.');
        return false;
      }
    } catch (e) {
      hideLoading();
      console.error("WebAuthn Registration Error:", e);
      showToast('error', 'Biométrie', 'Enregistrement du visage annulé ou échoué.');
      return false;
    }
  }

  return true;
}

async function verifyBiometrics(pointageType) {
  if (!state.bioRegistered) {
    const enrolled = await triggerBiometrics();
    if (!enrolled) return false;
  }

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
        return await triggerBiometrics();
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
      clientDataJSON: clientDataJSON,
      authenticatorData: authenticatorData,
      signature: signature,
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
    } else {
      showToast('error', '❌ Accès refusé', verifyData.error || 'Visage non reconnu');
      return false;
    }
  } catch (e) {
    hideLoading();
    console.error("WebAuthn Verification Error:", e);
    showToast('error', 'Biométrie', 'Vérification annulée ou échouée.');
    return false;
  }
}
