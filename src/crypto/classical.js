
function caesarEncrypt(text, shift) {
    if (typeof text !== 'string') {
        throw new Error('Teks harus berupa string.');
    }

    shift = ((Number(shift) % 26) + 26) % 26;

    return text.replace(/[a-z]/gi, (char) => {
        const base = char === char.toUpperCase() ? 65 : 97;
        return String.fromCharCode(
            ((char.charCodeAt(0) - base + shift) % 26) + base
        );
    });
}

function caesarDecrypt(text, shift) {
    return caesarEncrypt(text, -shift);
}

function vigenereEncrypt(text, key) {
    return vigenereProcess(text, key, true);
}

function vigenereDecrypt(text, key) {
    return vigenereProcess(text, key, false);
}

function vigenereProcess(text, key, encrypt) {
    if (typeof text !== 'string') {
        throw new Error('Teks harus berupa string.');
    }

    if (typeof key !== 'string' || !/^[a-zA-Z]+$/.test(key)) {
        throw new Error('Kunci Vigenere harus berisi huruf A-Z saja.');
    }

    const cleanKey = key.toUpperCase();
    let keyIndex = 0;

    return text.replace(/[a-z]/gi, (char) => {
        const base = char === char.toUpperCase() ? 65 : 97;
        const textValue = char.toUpperCase().charCodeAt(0) - 65;
        const keyValue = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;

        keyIndex++;

        const result = encrypt
            ? (textValue + keyValue) % 26
            : (textValue - keyValue + 26) % 26;

        return String.fromCharCode(result + base);
    });
}

module.exports = {
    caesarEncrypt,
    caesarDecrypt,
    vigenereEncrypt,
    vigenereDecrypt
};