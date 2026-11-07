
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const passwordFile = path.join(
  __dirname,
  'password.hash'
);

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');

  const hash = crypto.scryptSync(
    password,
    salt,
    64
  ).toString('hex');

  return `${salt}:${hash}`;
}

function verifyPassword(password) {
  if (!fs.existsSync(passwordFile)) {
    return false;
  }

  const stored = fs.readFileSync(
    passwordFile,
    'utf8'
  ).trim();

  const [salt, originalHash] = stored.split(':');

  if (!salt || !originalHash) return false;

  const inputHash = crypto.scryptSync(
    password,
    salt,
    64
  );

  const expectedHash = Buffer.from(
    originalHash,
    'hex'
  );

  return (
    inputHash.length === expectedHash.length &&
    crypto.timingSafeEqual(inputHash, expectedHash)
  );
}

module.exports = {
  createPasswordHash,
  verifyPassword
};
