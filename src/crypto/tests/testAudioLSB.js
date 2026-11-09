const path = require('path');

const {
    embedMessage,
    extractMessage
} = require('../audioSteganography');

const inputPath = path.join(__dirname, '..', '..', '..', 'assets', 'audio', 'Rekaman.wav');
const outputPath = path.join(__dirname, '..', '..', '..', 'assets', 'audio', 'Rekaman-Rahasia.wav');

const pesan = 'CONFIDANT';

try {
    // Menyisipkan pesan
    const hasil = embedMessage(inputPath, outputPath, pesan);

    console.log(hasil);

    // Mengekstrak pesan
    const hasilEkstraksi = extractMessage(outputPath);

    console.log('Pesan asli      :', pesan);
    console.log('Pesan ekstraksi :', hasilEkstraksi);

    console.log(
        'Status          :',
        pesan === hasilEkstraksi ? 'BERHASIL' : 'GAGAL'
    );

} catch (error) {
    console.error('Pengujian gagal:', error.message);
}