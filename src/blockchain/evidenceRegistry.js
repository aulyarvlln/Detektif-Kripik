const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const CHAIN_PATH = path.join(
    __dirname,
    '..',
    'data',
    'blockchain.json'
);

// Menghitung SHA-256 file bukti
async function calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);

    return crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex');
}

// Menghitung hash sebuah blok
function calculateBlockHash(block) {
    const blockData = {
        index: block.index,
        timestamp: block.timestamp,
        evidence: block.evidence,
        previousHash: block.previousHash
    };

    return crypto
        .createHash('sha256')
        .update(JSON.stringify(blockData))
        .digest('hex');
}

// Membaca blockchain
async function readChain() {
    try {
        const data = await fs.readFile(CHAIN_PATH, 'utf8');
        const parsed = JSON.parse(data);

        if (!parsed || !Array.isArray(parsed.chain)) {
            throw new Error('Format blockchain tidak valid.');
        }

        return parsed.chain;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }

        throw error;
    }
}

// Menyimpan blockchain
async function saveChain(chain) {
    await fs.writeFile(
        CHAIN_PATH,
        JSON.stringify({ chain }, null, 2),
        'utf8'
    );
}

// Mengubah lokasi file menjadi path relatif jika berada dalam proyek
function getStoredPath(filePath) {
    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(ROOT_DIR, absolutePath);

    if (
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
    ) {
        return absolutePath;
    }

    return relativePath;
}

// Mengembalikan path file untuk proses verifikasi
function resolveStoredPath(filePath) {
    return path.isAbsolute(filePath)
        ? filePath
        : path.resolve(ROOT_DIR, filePath);
}

// Mendaftarkan bukti ke blockchain
async function addEvidence(filePath, metadata = {}) {
    if (typeof filePath !== 'string' || !filePath.trim()) {
        throw new Error('Lokasi file bukti tidak valid.');
    }

    const absolutePath = path.resolve(filePath);
    const fileHash = await calculateFileHash(absolutePath);

    const chain = await readChain();

    const previousHash = chain.length > 0
        ? chain[chain.length - 1].hash
        : '0';

    const block = {
        index: chain.length,
        timestamp: new Date().toISOString(),

        evidence: {
            id: crypto.randomUUID(),
            fileName: path.basename(absolutePath),
            filePath: getStoredPath(absolutePath),
            fileHash,
            category: metadata.category || 'Dokumen',
            description: metadata.description || ''
        },

        previousHash
    };

    block.hash = calculateBlockHash(block);

    chain.push(block);

    await saveChain(chain);

    return {
        success: true,
        message: 'Bukti berhasil didaftarkan ke blockchain.',
        block
    };
}

// Mengambil seluruh rantai bukti
async function getChain() {
    return await readChain();
}

// Memverifikasi integritas blockchain
async function verifyChain() {
    const chain = await readChain();

    for (let i = 0; i < chain.length; i++) {
        const block = chain[i];

        if (block.index !== i) {
            return {
                valid: false,
                message: `Urutan blok ${i} tidak valid.`,
                invalidBlock: i
            };
        }

        const expectedPreviousHash = i === 0
            ? '0'
            : chain[i - 1].hash;

        if (block.previousHash !== expectedPreviousHash) {
            return {
                valid: false,
                message: `Keterkaitan blok ${i} tidak valid.`,
                invalidBlock: i
            };
        }

        const calculatedHash = calculateBlockHash(block);

        if (block.hash !== calculatedHash) {
            return {
                valid: false,
                message: `Hash blok ${i} telah berubah.`,
                invalidBlock: i
            };
        }
    }

    return {
        valid: true,
        message: 'Seluruh rantai blockchain valid.',
        totalBlocks: chain.length
    };
}

// Memverifikasi file terhadap catatan blockchain
async function verifyEvidence(evidenceId) {
    if (typeof evidenceId !== 'string' || !evidenceId.trim()) {
        throw new Error('ID bukti tidak valid.');
    }

    const chain = await readChain();

    const block = chain.find(
        item => item.evidence.id === evidenceId
    );

    if (!block) {
        return {
            valid: false,
            message: 'Bukti tidak ditemukan di blockchain.'
        };
    }

    try {
        const filePath = resolveStoredPath(
            block.evidence.filePath
        );

        const currentHash = await calculateFileHash(filePath);

        const valid = currentHash === block.evidence.fileHash;

        return {
            valid,
            message: valid
                ? 'File bukti masih asli dan tidak berubah.'
                : 'File bukti telah berubah.',
            evidenceId,
            fileName: block.evidence.fileName,
            originalHash: block.evidence.fileHash,
            currentHash
        };
    } catch {
        return {
            valid: false,
            message: 'File bukti tidak ditemukan atau tidak dapat dibaca.',
            evidenceId
        };
    }
}

module.exports = {
    addEvidence,
    getChain,
    verifyChain,
    verifyEvidence
};