const CONFIG = {
  webhooks: {
    entree: window.ENV?.WEBHOOK_ENTREE || '',
    sortie: window.ENV?.WEBHOOK_SORTIE || '',
    bioRegister: window.ENV?.BIO_REGISTER || '',
    bioSave: window.ENV?.BIO_SAVE || '',
    bioChallenge: window.ENV?.BIO_CHALLENGE || '',
    bioVerify: window.ENV?.BIO_VERIFY || ''
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
