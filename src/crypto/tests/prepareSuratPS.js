const fs = require('fs');
const path = require('path');

const {
    caesarDecrypt,
    vigenereDecrypt
} = require('../classical');

const {
    encryptSuper,
    decryptSuper
} = require('../superEncryption');

const suratPath = path.join(
    __dirname, '../../../assets/documents/Surat_PS.txt'
);

const outputPath = path.join(
    __dirname, '../../data/surat-ps.enc.json'
);

const CAESAR_KEY = 24;
const VIGENERE_KEY = 'BOGOR';
const AES_PASSWORD = 'DK014PS';

try {
    const surat = fs.readFileSync(suratPath, 'utf8');

    const bagian = surat.match(/---\r?\n([\s\S]*?)\r?\n---/);

    if (!bagian) {
        throw new Error('Isi ciphertext surat tidak ditemukan.');
    }

    const ciphertextLama = bagian[1].trim();

    // Pulihkan pesan asli dari ciphertext lama.
    const hasilVigenere = vigenereDecrypt(
        ciphertextLama,
        VIGENERE_KEY
    );

    const plaintext = caesarDecrypt(
        hasilVigenere,
        CAESAR_KEY
    );

    // Enkripsi ulang menggunakan tiga lapisan.
    const encrypted = encryptSuper(
        plaintext,
        CAESAR_KEY,
        VIGENERE_KEY,
        AES_PASSWORD
    );

    fs.writeFileSync(
        outputPath,
        JSON.stringify(encrypted, null, 2),
        'utf8'
    );

    // Verifikasi hasil.
    const hasilDekripsi = decryptSuper(
        encrypted,
        CAESAR_KEY,
        VIGENERE_KEY,
        AES_PASSWORD
    );

    if (hasilDekripsi !== plaintext) {
        throw new Error('Verifikasi super encryption gagal.');
    }

    console.log('Persiapan Surat PS BERHASIL.');
    console.log('Caesar:', CAESAR_KEY);
    console.log('Vigenere:', VIGENERE_KEY);
    console.log('AES: AES-256-GCM');
    console.log('Password AES:', AES_PASSWORD);
    console.log('Verifikasi:', 'BERHASIL');
    console.log('Lokasi:', outputPath);

} catch (error) {
    console.error('GAGAL:', error.message);
}