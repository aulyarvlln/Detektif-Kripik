
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [drive, serial] = process.argv.slice(2);

if (!drive || !serial) {
  console.log('Pemakaian: node tools/make-dongle.js E: 04CBE983');
  process.exit(1);
}

const privateKeyPath = path.join(
  __dirname,
  'keys',
  'private.pem'
);

if (!fs.existsSync(privateKeyPath)) {
  console.error('Private key tidak ditemukan.');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const payload = {
  version: 1,
  serial: serial.toUpperCase(),
  product: 'DetektifKripik'
};

const payloadString = JSON.stringify(payload);

const signature = crypto.sign(
  null,
  Buffer.from(payloadString),
  privateKey
).toString('base64');

const dongleData = {
  payload,
  signature
};

const dir = path.join(drive + '\\', '.DetektifKripik');

fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(
  path.join(dir, 'dongle.key'),
  JSON.stringify(dongleData, null, 2)
);

console.log('Dongle berhasil dibuat.');
console.log('Lokasi:', dir);
