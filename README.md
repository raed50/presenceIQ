# PresenceIQ — Système de Pointage Intelligent

PWA de géolocalisation pour employés avec authentification biométrique (WebAuthn).

## Fonctionnalités

- **Authentification biométrique** — Face ID / Empreinte via WebAuthn API
- **Géolocalisation GPS** — Vérification de la position obligatoire
- **Horloge temps réel** — Affichage en direct de l'heure
- **Pointage entrée/sortie** — avec détection automatique retard/anticipation
- **Historique local** — Sauvegarde dans localStorage
- **PWA installable** — Fonctionne hors ligne

## Stack technique

- **Frontend** — Vanilla JavaScript (sans framework)
- **Backend** — n8n workflows (webhooks)
- **Base de données** — Google Sheets
- **Sécurité** — WebAuthn API + validation GPS
- **Design** — CSS custom properties, animations fluides

## Architecture

```
presenceIQ/
├── index.html              ← Structure sémantique
├── css/
│   └── style.css           ← Design system
├── js/
│   ├── config.js           ← URLs webhooks + règles validation
│   ├── app.js              ← State, UI helpers, login/logout
│   ├── gps.js              ← Géolocalisation + horloge
│   ├── pointage.js         ← Logique pointage + historique
│   └── biometrie.js        ← WebAuthn (registration + vérification)
├── manifest.json           ← Configuration PWA
└── README.md
```

## Workflow n8n

### Entrée
1. Webhook reçoit les données (ID, GPS, timestamp)
2. Validation GPS + vérification retard
3. Log dans Google Sheets
4. Réponse au frontend

### Sortie
1. Webhook reçoit les données
2. Calcul des heures travaillées
3. Mise à jour dans Google Sheets
4. Réponse au frontend

## Installation

```bash
# Cloner le repo
git clone https://github.com/votre-username/presenceIQ.git

# Ouvrir dans un navigateur
# Utiliser un serveur local (requis pour WebAuthn)
npx serve .
```

## Note sur la biométrie

La fonctionnalité biométrique (WebAuthn) nécessite :
- **HTTPS** (sauf en localhost)
- Un navigateur supportant WebAuthn
- Un appareil avec Face ID / empreinte digitale

## License

MIT
