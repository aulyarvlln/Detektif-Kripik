
const {
    encryptDossier,
    decryptDossier
} = require('../dossierCrypto');

function testDossier() {
    try {
        const password = 'CONFIDANT';

        console.log('=== TEST ENKRIPSI DOSSIER ===');

        const hasilEnkripsi = encryptDossier(password);
        console.log(hasilEnkripsi.message);

        console.log('\n=== TEST DEKRIPSI DOSSIER ===');

        const hasilDekripsi = decryptDossier(password);

        console.log('\n=== TEST KATA KUNCI SALAH ===');

        try {
            decryptDossier('KUNCI-YANG-SALAH');
            console.log('GAGAL: Kata kunci salah diterima.');
        } catch (error) {
            console.log('BERHASIL: Kata kunci salah ditolak.');
        }

        console.log(
            'Judul kasus:',
            hasilDekripsi.case.title
        );

        console.log(
            'Jumlah tersangka:',
            hasilDekripsi.suspects.length
        );

        console.log(
            'Status:',
            hasilDekripsi.suspects.length === 4
                ? 'BERHASIL'
                : 'GAGAL'
        );

    } catch (error) {
        console.error('Pengujian gagal:', error.message);
    }
}

testDossier();