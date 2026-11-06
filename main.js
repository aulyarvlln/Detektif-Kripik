
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const { verifyDongle } = require('./src/crypto/dongle');

const DOTNET_DLL =
  'C:\\Users\\ACER\\DongleTest\\bin\\Release\\net10.0\\DongleTest.dll';

const FINGERPRINT_EXE =
  'C:\\Users\\ACER\\FingerprintTest\\bin\\Release\\net10.0-windows\\win-x64\\publish\\FingerprintTest.exe';

let loginWindow = null;
let gameWindow = null;

async function checkDongle() {
  try {
    const { stdout } = await execFileAsync(
      'dotnet',
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
    width: 400,
    height: 300,
    resizable: false,
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

app.whenReady().then(async () => {
  const dongle = await checkDongle();
  if (!dongle.valid) return showErrorAndQuit(dongle.message);

  const fp = await checkFingerprint();
  if (!fp.valid) return showErrorAndQuit(fp.message);

  // tahap password: tampilkan login.html dulu, validasi lewat IPC di main.js
  // game (index.html) HANYA di-load setelah password valid
  createGameWindow(); // sementara, sampai tahap password dibuat
});
