
const sharp = require('sharp');

// Mengubah pesan menjadi kumpulan bit
function textToBits(text) {
    const buffer = Buffer.isBuffer(text)
        ? text
        : Buffer.from(text, 'utf8');
    const bits = [];

    for (const byte of buffer) {
        for (let i = 7; i >= 0; i--) {
            bits.push((byte >> i) & 1);
        }
    }

    return bits;
}

// Menyisipkan pesan ke gambar
async function embedMessage(inputPath, outputPath, message) {
    const { data, info } = await sharp(inputPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const messageBuffer = Buffer.from(message, 'utf8');

    // Header: penanda DKIP + panjang pesan
    const header = Buffer.alloc(8);
    header.write('DKIP', 0, 'ascii');
    header.writeUInt32BE(messageBuffer.length, 4);

    const fullMessage = Buffer.concat([
        header,
        messageBuffer
    ]);

    const bits = textToBits(fullMessage);
    
    const capacity = info.width * info.height * 3;

    if (bits.length > capacity) {
        throw new Error('Pesan terlalu besar untuk gambar ini.');
    }

    let bitIndex = 0;

    for (let i = 0; i < data.length && bitIndex < bits.length; i += 4) {
        for (let channel = 0; channel < 3 && bitIndex < bits.length; channel++) {
            data[i + channel] =
                (data[i + channel] & 0xFE) | bits[bitIndex];

            bitIndex++;
        }
    }

    await sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4
        }
    })
        .png()
        .toFile(outputPath);

    return {
        success: true,
        message: 'Pesan berhasil disisipkan.'
    };
}

// Mengekstrak pesan dari gambar
async function extractMessage(imagePath) {
    const { data, info } = await sharp(imagePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const capacity = info.width * info.height * 3;

    function readBytes(startBit, byteLength) {
        if (startBit + byteLength * 8 > capacity) {
            throw new Error('Data tersembunyi tidak lengkap.');
        }

        const bytes = [];

        for (let i = 0; i < byteLength; i++) {
            let byte = 0;

            for (let j = 0; j < 8; j++) {
                const bitIndex = startBit + i * 8 + j;
                const pixelIndex = Math.floor(bitIndex / 3);
                const channel = bitIndex % 3;

                const bit = data[pixelIndex * 4 + channel] & 1;

                byte = (byte << 1) | bit;
            }

            bytes.push(byte);
        }

        return Buffer.from(bytes);
    }

    const header = readBytes(0, 8);

    if (header.toString('ascii', 0, 4) !== 'DKIP') {
        throw new Error('Tidak ditemukan pesan tersembunyi.');
    }

    const messageLength = header.readUInt32BE(4);

    if (8 + messageLength > Math.floor(capacity / 8)) {
        throw new Error('Panjang pesan tersembunyi tidak valid.');
    }

    const message = readBytes(64, messageLength);

    return message.toString('utf8');
}

module.exports = {
    embedMessage,
    extractMessage
};