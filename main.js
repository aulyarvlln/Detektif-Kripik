const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require("fs/promises");

const execFileAsync = promisify(execFile);

const { verifyDongle } = require('./src/crypto/dongle');
const { verifyPassword } = require('./src/crypto/password');

const allowedPages = new Set([
    "surat.html",
    "tools.html",
    "add-file.html",
    "rantai-bukti.html"
]);

const DOTNET_DLL =
  'C:\\Users\\Kripto\\DongleTest\\bin\\Release\\net10.0\\DongleTest.dll';

const FINGERPRINT_EXE =
  'C:\\Users\\Kripto\\FingerprintTest\\bin\\Release\\net10.0-windows\\win-x64\\publish\\FingerprintTest.exe';

let loginWindow = null;
let gameWindow = null;
let passwordAuthenticated = false;

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
