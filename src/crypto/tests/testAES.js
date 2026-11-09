const crypto = require('crypto');

const {
    encryptAES256GCM,
    decryptAES256GCM
} = require('../aes');

const plaintext = 'BUKTI RAHASIA DETEKTIF KRIPIK';

// Membuat key dan IV untuk pengujian
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(12);

// Enkripsi
const encrypted = encryptAES256GCM(
    plaintext,
    key,
    iv
);

console.log('=== HASIL ENKRIPSI AES-256-GCM ===');
console.log('Ciphertext:', encrypted.ciphertext);
console.log('IV:', encrypted.iv);
console.log('Auth Tag:', encrypted.authTag);

// Dekripsi
const decrypted = decryptAES256GCM(
    encrypted.ciphertext,
    key,
    iv,
    Buffer.from(encrypted.authTag, 'hex')
);

console.log('\n=== HASIL DEKRIPSI ===');
console.log('Plaintext:', decrypted);

console.log(
    '\nApakah cocok:',
    plaintext === decrypted ? 'BERHASIL' : 'GAGAL'
);