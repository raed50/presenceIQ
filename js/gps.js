// ===== GPS & CLOCK =====
function updateClock() {
  const now = new Date();
  document.getElementById('clock-display').textContent = now.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('clock-date').textContent = now.toLocaleDateString('fr-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function startGPS() {
  if (!navigator.geolocation) {
    setGPSStatus('error', 'GPS non supporté', '');
    return;
  }
  navigator.geolocation.watchPosition(
    pos => {
      state = { ...state, gpsLat: pos.coords.latitude, gpsLng: pos.coords.longitude, gpsReady: true };
      const acc = Math.round(pos.coords.accuracy);
      setGPSStatus('found', 'GPS actif · Précision ' + acc + 'm', state.gpsLat.toFixed(4) + ', ' + state.gpsLng.toFixed(4));
    },
    err => {
      state = { ...state, gpsReady: false };
      setGPSStatus('error', 'GPS refusé – activez la localisation', '');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}

function setGPSStatus(type, msg, coords) {
  const dot = document.getElementById('gps-dot');
  dot.className = 'gps-dot ' + type;
  document.getElementById('gps-status').textContent = msg;
  document.getElementById('gps-coords').textContent = coords;
}

setInterval(updateClock, 1000);
updateClock();
