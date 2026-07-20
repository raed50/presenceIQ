const CONFIG = {
  webhooks: {
    entree: '/api/proxy?webhook=pointage-entree',
    sortie: '/api/proxy?webhook=pointage-sortie',
    bioRegister: '/api/bio/register',
    bioSave: '/api/bio/save',
    bioChallenge: '/api/bio/challenge',
    bioVerify: '/api/bio/verify'
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
