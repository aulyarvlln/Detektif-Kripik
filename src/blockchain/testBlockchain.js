const fs = require('fs/promises');
const path = require('path');
const {
    addEvidence,
    getChain,
    verifyChain,
    verifyEvidence
} = require('./evidenceRegistry');

const projectDir = path.join(__dirname, '..', '..');
const chainPath = path.join(projectDir, 'src', 'data', 'blockchain.json');
const testFile = path.join(projectDir, 'src', 'data', 'test-bukti.txt');

async function testBlockchain() {
    let originalChain = null;

    try {
        // Amankan blockchain asli
        try {
            originalChain = await fs.readFile(chainPath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        await fs.writeFile(testFile, 'Bukti pengujian Detektif Kripik');

        // 1. Tes pendaftaran bukti
        const result = await addEvidence(testFile, {
            category: 'Pengujian',
            description: 'Bukti untuk pengujian blockchain'
        });

        console.log('1. Tambah bukti:', result.success ? 'BERHASIL' : 'GAGAL');

        // 2. Tes pembacaan rantai
        const chain = await getChain();
        console.log('2. Baca blockchain:', chain.length > 0 ? 'BERHASIL' : 'GAGAL');

        // 3. Tes validitas rantai
        const chainCheck = await verifyChain();
        console.log('3. Verifikasi rantai:', chainCheck.valid ? 'VALID' : 'GAGAL');

        // 4. Tes keaslian file
        const evidenceCheck = await verifyEvidence(result.block.evidence.id);
        console.log('4. Verifikasi bukti:', evidenceCheck.valid ? 'VALID' : 'GAGAL');

        // 5. Tes deteksi perubahan file
        await fs.writeFile(testFile, 'Isi bukti telah diubah');
        const tamperCheck = await verifyEvidence(result.block.evidence.id);
        console.log('5. Deteksi perubahan:', !tamperCheck.valid ? 'BERHASIL' : 'GAGAL');

    } catch (error) {
        console.error('Pengujian gagal:', error.message);
    } finally {
        // Pulihkan blockchain asli
        if (originalChain !== null) {
            await fs.writeFile(chainPath, originalChain);
        } else {
            await fs.rm(chainPath, { force: true });
        }

        await fs.rm(testFile, { force: true });
        console.log('\nData blockchain asli telah dipulihkan.');
    }
}

testBlockchain();