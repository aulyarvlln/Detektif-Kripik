const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
    encryptAES256GCM,
    decryptAES256GCM
} = require('./aes');

// Lokasi file dossier (teks asli dan hasil enkripsi)
const DATA_DIR = path.join(__dirname, '..', 'data');
const PLAIN_PATH = path.join(DATA_DIR, 'dossier.json');
const ENCRYPTED_PATH = path.join(DATA_DIR, 'dossier.enc.json');

// Merapikan kata kunci: buang spasi di ujung dan jadikan huruf besar,
// supaya "confidant ", "Confidant", dan "CONFIDANT" dianggap sama
function normalizePassword(password) {
    if (typeof password !== 'string' || !password.trim()) {
        throw new Error('Kata kunci tidak valid.');
    }

    return password.trim().toUpperCase();
}

// Mengubah kata kunci menjadi kunci AES-256
function deriveKey(password, salt, iterations) {
    return crypto.pbkdf2Sync(
        password,
        salt,
        iterations,
        32,
        'sha256'
    );
}

// Mengenkripsi dossier
function encryptDossier(password) {
    const normalized = normalizePassword(password);

    const plaintext = fs.readFileSync(PLAIN_PATH, 'utf8');

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const iterations = 210000;

    const key = deriveKey(normalized, salt, iterations);

    const encrypted = encryptAES256GCM(
        plaintext,
        key,
        iv
    );

    const dossierEncrypted = {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations,
        salt: salt.toString('hex'),
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        ciphertext: encrypted.ciphertext
    };

    fs.writeFileSync(
        ENCRYPTED_PATH,
        JSON.stringify(dossierEncrypted, null, 2)
    );

    return {
        success: true,
        message: 'Dossier berhasil dienkripsi.'
    };
}

// Mendekripsi dossier
function decryptDossier(password) {
    const normalized = normalizePassword(password);

    const encryptedData = JSON.parse(
        fs.readFileSync(ENCRYPTED_PATH, 'utf8')
    );

    if (
        encryptedData.algorithm !== 'AES-256-GCM' ||
        encryptedData.kdf !== 'PBKDF2-SHA256'
    ) {
        throw new Error('Format dossier tidak valid.');
    }

    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    if (salt.length !== 16) {
        throw new Error('Salt tidak valid.');
    }

    const key = deriveKey(
        normalized,
        salt,
        encryptedData.iterations
    );

    let plaintext;

    try {
        plaintext = decryptAES256GCM(
            encryptedData.ciphertext,
            key,
            iv,
            authTag
        );
    } catch {
        // Kata kunci salah membuat pemeriksaan auth tag AES-GCM gagal
        throw new Error('Kata kunci dossier salah.');
    }

    return JSON.parse(plaintext);
}

module.exports = {
    encryptDossier,
    decryptDossier
};