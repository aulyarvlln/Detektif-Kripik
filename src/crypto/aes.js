
const crypto = require('crypto');

function validateInputs(key, iv) {
    if (!Buffer.isBuffer(key) || key.length !== 32) {
        throw new Error('Kunci AES-256 harus berukuran 32 byte.');
    }

    if (!Buffer.isBuffer(iv) || iv.length !== 12) {
        throw new Error('IV AES-GCM harus berukuran 12 byte.');
    }
}

function encryptAES256GCM(plaintext, key, iv) {
    validateInputs(key, iv);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex')
    };
}

function decryptAES256GCM(ciphertext, key, iv, authTag) {
    validateInputs(key, iv);

    if (!Buffer.isBuffer(authTag) || authTag.length !== 16) {
        throw new Error('Authentication tag harus berukuran 16 byte.');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

function encryptTextWithPassword(plaintext, password) {
    if (typeof plaintext !== 'string' || !plaintext.trim()) {
        throw new Error('Teks tidak boleh kosong.');
    }

    if (typeof password !== 'string' || !password.trim()) {
        throw new Error('Kata kunci tidak boleh kosong.');
    }

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const iterations = 210000;

    const key = crypto.pbkdf2Sync(
        password.trim(),
        salt,
        iterations,
        32,
        'sha256'
    );

    const encrypted = encryptAES256GCM(
        plaintext,
        key,
        iv
    );

    return {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations,
        salt: salt.toString('hex'),
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        ciphertext: encrypted.ciphertext
    };
}

function decryptTextWithPassword(data, password) {
    if (typeof password !== 'string' || !password.trim()) {
        throw new Error('Kata kunci tidak boleh kosong.');
    }

    if (!data || data.algorithm !== 'AES-256-GCM' ||
        data.kdf !== 'PBKDF2-SHA256') {
        throw new Error('Format ciphertext AES tidak valid.');
    }

    const salt = Buffer.from(data.salt, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');

    if (
        salt.length !== 16 ||
        iv.length !== 12 ||
        authTag.length !== 16 ||
        !Number.isInteger(data.iterations) ||
        data.iterations < 1 ||
        data.iterations > 1000000 ||
        typeof data.ciphertext !== 'string'
    ) {
        throw new Error('Data AES tidak valid.');
    }

    const key = crypto.pbkdf2Sync(
        password.trim(),
        salt,
        data.iterations,
        32,
        'sha256'
    );

    return decryptAES256GCM(
        data.ciphertext,
        key,
        iv,
        authTag
    );
}

module.exports = {
    encryptAES256GCM,
    decryptAES256GCM,
    encryptTextWithPassword,
    decryptTextWithPassword
};