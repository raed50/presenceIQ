const fs = require('fs');
const path = require('path');

const envConfig = `
<script>
  window.ENV = {
    WEBHOOK_ENTREE: '${process.env.WEBHOOK_ENTREE || ''}',
    WEBHOOK_SORTIE: '${process.env.WEBHOOK_SORTIE || ''}',
    BIO_REGISTER: '${process.env.BIO_REGISTER || ''}',
    BIO_SAVE: '${process.env.BIO_SAVE || ''}',
    BIO_CHALLENGE: '${process.env.BIO_CHALLENGE || ''}',
    BIO_VERIFY: '${process.env.BIO_VERIFY || ''}'
  };
</script>
`;

const envPath = path.join(__dirname, 'public', 'env-config.js');

fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(envPath, envConfig.trim());

console.log('✅ env-config.js generated');
