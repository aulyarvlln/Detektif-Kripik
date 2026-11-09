
const fs = require('fs');

// Membaca posisi data audio berdasarkan struktur WAV
function readWav(filePath) {
    const wav = fs.readFileSync(filePath);

    if (wav.toString('ascii', 0, 4) !== 'RIFF' ||
        wav.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error('File bukan WAV yang valid.');
    }

    let position = 12;
    let dataStart = -1;
    let dataSize = 0;

    while (position + 8 <= wav.length) {
        const chunkId = wav.toString('ascii', position, position + 4);
        const chunkSize = wav.readUInt32LE(position + 4);

        if (position + 8 + chunkSize > wav.length) {
            throw new Error('Struktur WAV tidak valid.');
        }

        if (chunkId === 'data') {
            dataStart = position + 8;
            dataSize = chunkSize;
            break;
        }

        position += 8 + chunkSize + (chunkSize % 2);
    }

    if (dataStart === -1) {
        throw new Error('Bagian data audio tidak ditemukan.');
    }

    return {
        wav,
        dataStart,
        dataSize
    };
}

// Menyisipkan pesan menggunakan LSB
function embedMessage(inputPath, outputPath, message) {
    const { wav, dataStart, dataSize } = readWav(inputPath);
    const output = Buffer.from(wav);

    const messageBytes = Buffer.from(message + '\0', 'utf8');
    const requiredBits = messageBytes.length * 8;

    if (requiredBits > Math.floor(dataSize / 2)) {
        throw new Error('Pesan terlalu panjang.');
    }

    let bitIndex = 0;

    for (const byte of messageBytes) {
        for (let i = 7; i >= 0; i--) {
            const bit = (byte >> i) & 1;
            const samplePosition = dataStart + bitIndex * 2;

            output[samplePosition] =
                (output[samplePosition] & 0xFE) | bit;

            bitIndex++;
        }
    }

    fs.writeFileSync(outputPath, output);

    return 'Pesan berhasil disisipkan.';
}

// Mengekstrak pesan menggunakan LSB
function extractMessage(inputPath) {
    const { wav, dataStart, dataSize } = readWav(inputPath);

    const extractedBytes = [];
    let currentByte = 0;
    let bitCount = 0;

    for (let i = 0; i < Math.floor(dataSize / 2); i++) {
        const bit = wav[dataStart + i * 2] & 1;

        currentByte = (currentByte << 1) | bit;
        bitCount++;

        if (bitCount === 8) {
            if (currentByte === 0) {
                return Buffer.from(extractedBytes).toString('utf8');
            }

            extractedBytes.push(currentByte);
            currentByte = 0;
            bitCount = 0;
        }
    }

    throw new Error('Pesan rahasia tidak ditemukan.');
}

module.exports = {
    embedMessage,
    extractMessage
};