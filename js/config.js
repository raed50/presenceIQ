const CONFIG = {
  webhooks: {
    entree: 'https://mourad111-n8n.hf.space/webhook/pointage-entree',
    sortie: 'https://mourad111-n8n.hf.space/webhook/pointage-sortie',
    bioRegister: 'https://mourad111-n8n.hf.space/webhook/bio-register',
    bioSave: 'https://mourad111-n8n.hf.space/webhook/bio-save',
    bioChallenge: 'https://mourad111-n8n.hf.space/webhook/bio-challenge',
    bioVerify: 'https://mourad111-n8n.hf.space/webhook/bio-verify'
  },
  validation: {
    idMinLen: 2,
    idMaxLen: 20,
    idPattern: /^[A-Za-z0-9_-]+$/,
    nomMinLen: 2,
    nomMaxLen: 80,
    nomPattern: /^[A-Za-zÀ-ÿ\s'-]+$/
  }
};
