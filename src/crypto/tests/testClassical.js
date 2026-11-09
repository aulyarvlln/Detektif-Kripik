const {
    caesarEncrypt,
    caesarDecrypt,
    vigenereEncrypt,
    vigenereDecrypt
} = require('../classical');

console.log('=== TEST CAESAR CIPHER ===');

const caesar = caesarEncrypt('BOGOR', 24);
console.log('Enkripsi BOGOR:', caesar);
console.log('Dekripsi:', caesarDecrypt(caesar, 24));

console.log('\n=== TEST VIGENERE CIPHER ===');

const vigenere = vigenereEncrypt(
    'DETEKTIF KRIPIK',
    'ZMEMP'
);

console.log('Enkripsi:', vigenere);
console.log(
    'Dekripsi:',
    vigenereDecrypt(vigenere, 'ZMEMP')
);