const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require("fs/promises");

const execFileAsync = promisify(execFile);

// Lokasi penyimpanan daftar file tambahan
function getAddedImagesPath() {
    return path.join(app.getPath('userData'), 'added-images.json');
}

// Membaca daftar file tambahan
async function getAddedImages() {
    try {
        const data = await fs.readFile(getAddedImagesPath(), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Menyimpan daftar file tambahan
async function saveAddedImages(images) {
    const filePath = getAddedImagesPath();

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(images, null, 2), 'utf8');
}

const { verifyDongle } = require('./src/crypto/dongle');
const { verifyPassword } = require('./src/crypto/password');
const { caesarEncrypt, caesarDecrypt, vigenereEncrypt, vigenereDecrypt } = require('./src/crypto/classical');
const { embedMessage, extractMessage } = require('./src/crypto/imageSteganography');
const { decryptDossier } = require('./src/crypto/dossierCrypto');
const { encryptSuper, decryptSuper } = require('./src/crypto/superEncryption');
const { encryptTextWithPassword, decryptTextWithPassword } = require('./src/crypto/aes');
const { extractMessage: extractAudioMessage } = require('./src/crypto/audioSteganography');
const { addEvidence, getChain, verifyChain, verifyEvidence } = require('./src/blockchain/evidenceRegistry');

const allowedPages = new Set([
    "surat.html",
    "tools.html",
    "add-file.html",
    "rantai-bukti.html",
    "rekaman.html",
    "dossier.html",
    "tkp.html",
    "file-tambahan.html"
]);

const DOTNET_EXE =
  'C:\\Program Files\\dotnet\\dotnet.exe';

const DOTNET_DLL =
  'C:\\Users\\Kripto\\DongleTest\\bin\\Release\\net10.0\\DongleTest.dll';

const FINGERPRINT_EXE =
  'C:\\Users\\Kripto\\FingerprintTest\\bin\\Release\\net10.0-windows\\win-x64\\publish\\FingerprintTest.exe';

let loginWindow = null;
let gameWindow = null;
let passwordAuthenticated = false;

// Status akses rekaman audio
let audioUnlocked = false;
let audioListened = false;

async function checkDongle() {
  try {
    const { stdout } = await execFileAsync(
      DOTNET_EXE,
      [DOTNET_DLL],
      { timeout: 10000 }
    );

    const drives = JSON.parse(stdout);

    for (const drive of drives) {
      if (!drive.serial || !drive.keyContent) {
        continue;
      }

      const result = verifyDongle(
        drive.serial,
        drive.keyContent
      );

      if (result.valid) {
        return {
          valid: true,
          message: result.message,
          drive: drive.drive
        };
      }
    }

    return {
      valid: false,
      message: 'Dongle tidak ditemukan atau tidak valid.'
    };

  } catch (error) {
    console.error('Dongle error:', error.message);

    return {
      valid: false,
      message: 'Gagal menjalankan pemeriksaan dongle.'
    };
  }
}

function checkFingerprint() {
  return new Promise((resolve) => {
    const child = spawn(FINGERPRINT_EXE, [], {
      windowsHide: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ valid: false, message: 'Waktu verifikasi habis.' });
    }, 30000);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ valid: false, message: e.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const r = JSON.parse(stdout.trim().split('\n').pop());
        resolve({ valid: code === 0 && r.valid === true, message: r.message });
      } catch {
        resolve({ valid: false, message: 'Output helper tidak valid.' });
      }
    });
  });
}

ipcMain.handle('dongle:check', async () => {
  return await checkDongle();
});

ipcMain.handle('crypto:classical', (event, data) => {
    if (
        !gameWindow ||
        event.sender !== gameWindow.webContents
    ) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (!data || typeof data !== 'object') {
        throw new Error('Data kriptografi tidak valid.');
    }

    const { algorithm, operation, text, key } = data;

    if (typeof text !== 'string') {
        throw new Error('Teks harus berupa string.');
    }

    if (algorithm === 'caesar') {
        if (operation === 'encrypt') {
            return caesarEncrypt(text, key);
        }

        if (operation === 'decrypt') {
            return caesarDecrypt(text, key);
        }
    }

    if (algorithm === 'vigenere') {
        if (operation === 'encrypt') {
            return vigenereEncrypt(text, key);
        }

        if (operation === 'decrypt') {
            return vigenereDecrypt(text, key);
        }
    }

    throw new Error('Algoritma atau operasi tidak valid.');
});

// Steganografi gambar
// Menyimpan lokasi gambar yang dipilih
let selectedImagePath = null;

// Memilih gambar PNG
ipcMain.handle('crypto:image:select', async (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const result = await dialog.showOpenDialog(gameWindow, {
        title: 'Pilih Gambar PNG',
        filters: [{ name: 'Gambar PNG', extensions: ['png'] }],
        properties: ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
        return { cancelled: true };
    }

    selectedImagePath = result.filePaths[0];

    const fs = require('fs');
    const imageBuffer = await fs.promises.readFile(selectedImagePath);

    return {
        success: true,
        fileName: path.basename(selectedImagePath),
        preview: `data:image/png;base64,${imageBuffer.toString('base64')}`
    };
});

// Menyisipkan pesan ke gambar yang sudah dipilih
ipcMain.handle('crypto:image:embed', async (event, message) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (typeof message !== 'string' || !message.trim()) {
        throw new Error('Pesan rahasia tidak valid.');
    }

    if (!selectedImagePath) {
        throw new Error('Pilih gambar PNG terlebih dahulu.');
    }

    const saveResult = await dialog.showSaveDialog(gameWindow, {
        title: 'Simpan Gambar Rahasia',
        defaultPath: path.join(
            path.dirname(selectedImagePath),
            'Foto_Rahasia.png'
        ),
        filters: [{ name: 'Gambar PNG', extensions: ['png'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
        return { cancelled: true };
    }

    const hasil = await embedMessage(
        selectedImagePath,
        saveResult.filePath,
        message
    );

    if (hasil.success) {
        selectedImagePath = null;

        const daftarFile = await getAddedImages();

        daftarFile.push({
          id: Date.now().toString(),
          fileName: path.basename(saveResult.filePath),
          filePath: saveResult.filePath,
          addedAt: new Date().toISOString(),
        });

        await saveAddedImages(daftarFile);
        return {
            ...hasil,
            fileName: path.basename(saveResult.filePath),
            filePath: saveResult.filePath
        };
    }
    return hasil;
});

// Mengambil daftar file tambahan
ipcMain.handle('crypto:image:list', async (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    return await getAddedImages();
});

// Membaca gambar berdasarkan ID yang terdaftar
ipcMain.handle('crypto:image:read', async (event, imageId) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const daftarFile = await getAddedImages();
    const file = daftarFile.find(item => item.id === imageId);

    if (!file) {
        throw new Error('File tidak ditemukan.');
    }

    const imageBuffer = await fs.readFile(file.filePath);

    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
});

ipcMain.handle('crypto:image:extract', async (event, imageId) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const daftarFile = await getAddedImages();
    const file = daftarFile.find(item => item.id === imageId);

    if (!file) {
        throw new Error('File tidak ditemukan.');
    }

    const message = await extractMessage(file.filePath);

    return {
        success: true,
        message
    };
});

// Ekstraksi pesan LSB langsung dari foto dossier
ipcMain.handle('crypto:dossier:extract-image', async (event, namaFile) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const daftarFoto = [
        'Mega_Rahasia.png',
        'Ines_Rahasia.png',
        'Teddy_Rahasia.png',
        'Jar_Rahasia.png'
    ];

    if (!daftarFoto.includes(namaFile)) {
        throw new Error('Foto dossier tidak valid.');
    }

    const imagePath = path.join(
        __dirname,
        'assets',
        'images',
        namaFile
    );

    const message = await extractMessage(imagePath);

    return {
        success: true,
        message
    };
});

// Ekstraksi pesan LSB dari foto TKP
ipcMain.handle('crypto:tkp:extract-image', async (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const imagePath = path.join(
        __dirname,
        'assets',
        'images',
        'Foto_TKP.png'
    );

    const message = await extractMessage(imagePath);

    return {
        success: true,
        message
    };
});

// Verifikasi password untuk membuka rekaman
ipcMain.handle('crypto:audio:unlock', (event, password) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (password !== '1411') {
        throw new Error('Password rekaman salah.');
    }

    audioUnlocked = true;
    audioListened = false;

    return {
        success: true,
        message: 'Rekaman berhasil dibuka.'
    };
});

// Mengambil file audio untuk diputar
ipcMain.handle('crypto:audio:get', async (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (!audioUnlocked) {
        throw new Error('Rekaman belum dibuka.');
    }

    const audioPath = path.join(
        __dirname,
        'assets',
        'audio',
        'Rekaman-Rahasia.wav'
    );

    const audioBuffer = await fs.readFile(audioPath);

    return audioBuffer.toString('base64');
});

// Menandai rekaman sudah selesai didengarkan
ipcMain.handle('crypto:audio:mark-listened', (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (!audioUnlocked) {
        throw new Error('Rekaman belum dibuka.');
    }

    audioListened = true;

    return {
        success: true,
        message: 'Rekaman selesai didengarkan.'
    };
});

// Steganografi audio LSB
ipcMain.handle('crypto:audio:extract', (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (!audioUnlocked) {
        throw new Error('Rekaman belum dibuka.');
    }

    if (!audioListened) {
        throw new Error('Dengarkan rekaman terlebih dahulu.');
    }

    const audioPath = path.join(
        __dirname,
        'assets',
        'audio',
        'Rekaman-Rahasia.wav'
    );

    const message = extractAudioMessage(audioPath);

    return {
        success: true,
        message
    };
});

// AES-256-GCM untuk Tools
ipcMain.handle('crypto:aes:process', (event, data) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (!data || typeof data !== 'object') {
        throw new Error('Data AES tidak valid.');
    }

    const { operation, text, password } = data;

    if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Teks tidak boleh kosong.');
    }

    if (typeof password !== 'string' || !password.trim()) {
        throw new Error('Kata kunci tidak boleh kosong.');
    }

    if (operation === 'encrypt') {
        const result = encryptTextWithPassword(text, password);
        return JSON.stringify(result, null, 2);
    }

    if (operation === 'decrypt') {
        let encryptedData;

        try {
            encryptedData = JSON.parse(text);
        } catch {
            throw new Error('Ciphertext AES harus berupa JSON yang valid.');
        }

        return decryptTextWithPassword(encryptedData, password);
    }

    throw new Error('Operasi AES tidak valid.');
});

// Mengambil data terenkripsi Surat PS
ipcMain.handle('crypto:surat:get', (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const suratPath = path.join(
        __dirname,
        'src',
        'data',
        'surat-ps.enc.json'
    );

    const data = require('fs').readFileSync(suratPath, 'utf8');

    return JSON.parse(data);
});

// Membuka lapisan AES Surat PS
ipcMain.handle('crypto:surat:decrypt', (event, password) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (typeof password !== 'string' || !password.trim()) {
        throw new Error('Password tidak boleh kosong.');
    }

    const suratPath = path.join(
        __dirname,
        'src',
        'data',
        'surat-ps.enc.json'
    );

    const data = JSON.parse(
        require('fs').readFileSync(suratPath, 'utf8')
    );

    if (password !== 'DK014PS') {
        throw new Error('Password Surat PS salah.');
    }

    return decryptTextWithPassword(
        data.encryptedData,
        password
    );
});

// Dekripsi dossier tersangka
ipcMain.handle('crypto:dossier:decrypt', (event, password) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    if (typeof password !== 'string' || !password.trim()) {
        throw new Error('Kata kunci dossier tidak valid.');
    }

    return decryptDossier(password);
});

// Mendaftarkan bukti
ipcMain.handle('blockchain:evidence:add', async (event, metadata = {}) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    const result = await dialog.showOpenDialog(gameWindow, {
        title: 'Pilih File Bukti',
        properties: ['openFile'],
        filters: [
            {
                name: 'File Bukti',
                extensions: ['txt', 'png', 'jpg', 'jpeg', 'wav', 'mp3', 'pdf', 'json']
            }
        ]
    });

    if (result.canceled || !result.filePaths.length) {
        return { cancelled: true };
    }

    return await addEvidence(result.filePaths[0], metadata);
});

// Mengambil seluruh blockchain
ipcMain.handle('blockchain:chain:get', async (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    return await getChain();
});

// Memverifikasi seluruh blockchain
ipcMain.handle('blockchain:chain:verify', async (event) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    return await verifyChain();
});

// Memverifikasi file bukti
ipcMain.handle('blockchain:evidence:verify', async (event, evidenceId) => {
    if (!gameWindow || event.sender !== gameWindow.webContents) {
        throw new Error('Permintaan tidak diizinkan.');
    }

    return await verifyEvidence(evidenceId);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');

  win.webContents.once('did-finish-load', async () => {
    const dongleResult = await checkDongle();

    console.log('HASIL PEMERIKSAAN DONGLE:', dongleResult);

    if (!dongleResult.valid) {
      console.log('Autentikasi dihentikan: dongle tidak valid.');
      return;
    }

    console.log('Dongle valid. Melanjutkan ke fingerprint...');

    const fingerprintResult = await checkFingerprint();

    console.log(
      'HASIL VERIFIKASI FINGERPRINT:',
      fingerprintResult
    );
  });
}

function showErrorAndQuit(message) {
  dialog.showErrorBox('Autentikasi Gagal', message);
  app.quit();
}


function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    center: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  loginWindow.loadFile('login.html');
}

function createGameWindow() {
  gameWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  gameWindow.loadFile('index.html');
}

ipcMain.handle('password:verify', (event, password) => {
  if (!loginWindow ||
      event.sender !== loginWindow.webContents) {
    return {
      valid: false,
      message: 'Permintaan autentikasi tidak valid.'
    };
  }

  if (typeof password !== 'string' || !password) {
    return {
      valid: false,
      message: 'Password tidak boleh kosong.'
    };
  }

  const valid = verifyPassword(password);

  passwordAuthenticated = valid;

  return {
    valid,
    message: valid
      ? 'Password benar.'
      : 'Password salah.'
  };
});

ipcMain.handle('game:open', (event) => {
  if (
    !passwordAuthenticated ||
    !loginWindow ||
    event.sender !== loginWindow.webContents
  ) {
    return false;
  }

  passwordAuthenticated = false;

  createGameWindow();

  if (loginWindow) {
    loginWindow.close();
    loginWindow = null;
  }

  return true;
});

ipcMain.handle("page:load", async (_event, fileName) => {

    if (
        typeof fileName !== "string" ||
        !allowedPages.has(fileName)
    ) {
        throw new Error("Nama halaman tidak diizinkan.");
    }

    const filePath = path.join(
        __dirname,
        "pages",
        fileName
    );

    return fs.readFile(filePath, "utf8");

});

app.whenReady().then(async () => {
  const dongle = await checkDongle();

  if (!dongle.valid) {
    return showErrorAndQuit(dongle.message);
  }

  const fp = await checkFingerprint();

  if (!fp.valid) {
    return showErrorAndQuit(fp.message);
  }

  createLoginWindow();
});
