
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY_PATH = path.join(
  __dirname,
  'public.pem'
);

function verifyDongle(serial, keyContent) {
  try {
    if (!serial || !keyContent) {
      return {
        valid: false,
        message: 'Dongle tidak ditemukan.'
      };
    }

    const publicKey = fs.readFileSync(
      PUBLIC_KEY_PATH,
      'utf8'
    );

    const dongle = JSON.parse(keyContent);

    if (!dongle.payload || !dongle.signature) {
      return {
        valid: false,
        message: 'Format dongle tidak valid.'
      };
    }

    const payload = dongle.payload;

    if (
      payload.version !== 1 ||
      payload.product !== 'DetektifKripik'
    ) {
      return {
        valid: false,
        message: 'Identitas dongle tidak valid.'
      };
    }

    if (
      payload.serial.toUpperCase() !== serial.toUpperCase()
    ) {
      return {
        valid: false,
        message: 'Serial number tidak cocok.'
      };
    }

    const payloadString = JSON.stringify(payload);

    const validSignature = crypto.verify(
      null,
      Buffer.from(payloadString),
      publicKey,
      Buffer.from(dongle.signature, 'base64')
    );

    if (!validSignature) {
      return {
        valid: false,
        message: 'Tanda tangan digital tidak valid.'
      };
    }

    return {
      valid: true,
      message: 'Dongle berhasil diverifikasi.'
    };

  } catch (error) {
    return {
      valid: false,
      message: 'Terjadi kesalahan saat verifikasi dongle.'
    };
  }
}

module.exports = {
  verifyDongle
};
