const {
    encryptSuper,
    decryptSuper
} = require('../superEncryption');

const plaintext = 'PESAN RAHASIA MR PS';

const caesarKey = 3;
const vigenereKey = 'BOGOR';
const aesPassword = 'DETEKTIF1411';

console.log('========== UJI SUPER ENCRYPTION ==========');

try {
    const encrypted = encryptSuper(
        plaintext,
        caesarKey,
        vigenereKey,
        aesPassword
    );

    console.log('\n1. Enkripsi berhasil.');
    console.log('Algoritma:', encrypted.algorithm);
    console.log('Lapisan:', encrypted.layers.join(' -> '));
    console.log('Hasil AES:');
    console.log(JSON.stringify(encrypted.encryptedData, null, 2));

    const decrypted = decryptSuper(
        encrypted,
        caesarKey,
        vigenereKey,
        aesPassword
    );

    console.log('\n2. Hasil dekripsi:', decrypted);
    console.log(
        '\n3. Kesesuaian:',
        decrypted === plaintext ? 'BERHASIL' : 'GAGAL'
    );

    try {
        decryptSuper(
            encrypted,
            caesarKey,
            vigenereKey,
            'PASSWORD-SALAH'
        );
    } catch (error) {
        console.log('\n4. Password salah:', error.message);
    }

} catch (error) {
    console.error('Pengujian gagal:', error.message);
}