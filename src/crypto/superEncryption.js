const {
    caesarEncrypt,
    caesarDecrypt,
    vigenereEncrypt,
    vigenereDecrypt
} = require('./classical');

const {
    encryptTextWithPassword,
    decryptTextWithPassword
} = require('./aes');

// Enkripsi berlapis
function encryptSuper(plaintext, caesarKey, vigenereKey, aesPassword) {
    if (typeof plaintext !== 'string' || !plaintext.trim()) {
        throw new Error('Teks asli tidak boleh kosong.');
    }

    // Lapisan 1: Caesar Cipher
    const caesarResult = caesarEncrypt(plaintext, caesarKey);

    // Lapisan 2: Vigenere Cipher
    const vigenereResult = vigenereEncrypt(caesarResult, vigenereKey);

    // Lapisan 3: AES-256-GCM
    const aesResult = encryptTextWithPassword(
        vigenereResult,
        aesPassword
    );

    return {
        algorithm: 'SUPER-ENCRYPTION',
        layers: [
            'CAESAR',
            'VIGENERE',
            'AES-256-GCM'
        ],
        encryptedData: aesResult
    };
}

// Dekripsi berlapis
function decryptSuper(data, caesarKey, vigenereKey, aesPassword) {
    if (!data || data.algorithm !== 'SUPER-ENCRYPTION') {
        throw new Error('Format super encryption tidak valid.');
    }

    // Lapisan 3: AES-256-GCM
    const aesResult = decryptTextWithPassword(
        data.encryptedData,
        aesPassword
    );

    // Lapisan 2: Vigenere Cipher
    const vigenereResult = vigenereDecrypt(
        aesResult,
        vigenereKey
    );

    // Lapisan 1: Caesar Cipher
    const plaintext = caesarDecrypt(
        vigenereResult,
        caesarKey
    );

    return plaintext;
}

module.exports = {
    encryptSuper,
    decryptSuper
};