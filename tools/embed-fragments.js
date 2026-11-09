// Skrip sekali jalan untuk membuat soal: menanam potongan kata ke foto tersangka.
// Cara pakai (dari folder proyek): node tools/embed-fragments.js
//
// Aman dijalankan ulang: foto asli dicadangkan sekali saja,
// dan penyisipan selalu dimulai dari foto cadangan itu.

const fs = require('fs');
const path = require('path');

const { embedMessage, extractMessage } = require('../src/crypto/imageSteganography');

// Lokasi foto tersangka dan folder cadangan foto asli
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const BACKUP_DIR = path.join(__dirname, 'backup-foto-asli');

// Urutan di sini menentukan urutan gabungan kata: tr + ai + to + r
const FRAGMENTS = [
    { name: 'Mega', photo: 'Mega.png', fragment: 'tr' },
    { name: 'Ines', photo: 'Ines.png', fragment: 'ai' },
    { name: 'Teddy', photo: 'Teddy.png', fragment: 'to' },
    { name: 'Jar', photo: 'Jar.png', fragment: 'r' }
];

async function main() {
    fs.mkdirSync(BACKUP_DIR, { recursive: true }); // buat folder cadangan kalau belum ada

    const hasil = [];

    for (const item of FRAGMENTS) {
        const target = path.join(IMAGES_DIR, item.photo); // foto yang akan diisi pesan
        const backup = path.join(BACKUP_DIR, item.photo); // salinan foto asli
        const temp = path.join(IMAGES_DIR, `${item.photo}.tmp.png`); // file sementara

        if (!fs.existsSync(target) && !fs.existsSync(backup)) {
            throw new Error(`Foto tidak ditemukan: ${item.photo}`);
        }

        // Cadangkan foto asli hanya sekali (jangan menimpa cadangan yang sudah ada)
        if (!fs.existsSync(backup)) {
            fs.copyFileSync(target, backup);
        }

        // Sisipkan pesan dari foto asli ke file sementara
        await embedMessage(backup, temp, item.fragment);

        // Periksa dulu: pesan yang terbaca harus sama dengan yang disisipkan
        const terbaca = await extractMessage(temp);

        if (terbaca !== item.fragment) {
            fs.unlinkSync(temp);
            throw new Error(`Verifikasi gagal untuk ${item.photo}: terbaca "${terbaca}"`);
        }

        // Verifikasi lolos, baru ganti foto di folder assets
        fs.renameSync(temp, target);

        hasil.push(terbaca);
        console.log(`OK  ${item.name.padEnd(6)} (${item.photo}) -> "${terbaca}"`);
    }

    console.log(`\nGabungan: ${hasil.join('').toUpperCase()}`);
}

main().catch((error) => {
    console.error('GAGAL:', error.message);
    process.exit(1);
});