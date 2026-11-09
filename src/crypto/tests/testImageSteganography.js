const path = require('path');
const sharp = require('sharp');

const {
    embedMessage,
    extractMessage
} = require('../imageSteganography');

async function testSteganography() {
    const inputPath = path.join(__dirname, '..', '..', '..', 'assets', 'images', 'TKP.png');
const outputPath = path.join(__dirname, '..', '..', '..', 'assets', 'images', 'Foto_TKP.png');

    const pesan = 'Tangan kanan adalah tangan yang sama untuk membinasakanku';

    // Menyisipkan pesan
    const hasil = await embedMessage(
        inputPath,
        outputPath,
        pesan
    );

    console.log(hasil.message);

    // Mengekstrak pesan
    const pesanEkstraksi = await extractMessage(outputPath);

    console.log('Pesan asli:', pesan);
    console.log('Pesan ekstraksi:', pesanEkstraksi);

    console.log(
        'Status:',
        pesan === pesanEkstraksi ? 'BERHASIL' : 'GAGAL'
    );
}

testSteganography().catch(console.error);