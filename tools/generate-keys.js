
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const keyDir = path.join(__dirname, 'keys');

fs.mkdirSync(keyDir, { recursive: true });

fs.writeFileSync(
  path.join(keyDir, 'private.pem'),
  privateKey.export({
    type: 'pkcs8',
    format: 'pem'
  })
);

fs.writeFileSync(
  path.join(keyDir, 'public.pem'),
  publicKey.export({
    type: 'spki',
    format: 'pem'
  })
);

console.log('Key pair berhasil dibuat.');
console.log('Private key: tools/keys/private.pem');
console.log('Public key: tools/keys/public.pem');
