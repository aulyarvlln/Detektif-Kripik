
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { createPasswordHash } = require('../src/crypto/password');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Masukkan password aplikasi: ', (password) => {
  if (!password || password.length < 8) {
    console.log('Password minimal 8 karakter.');
    rl.close();
    return;
  }

  const hash = createPasswordHash(password);

  const outputPath = path.join(
    __dirname,
    '../src/crypto/password.hash'
  );

  fs.writeFileSync(outputPath, hash, {
    encoding: 'utf8',
    mode: 0o600
  });

  console.log('Hash password berhasil disimpan.');

  rl.close();
});
