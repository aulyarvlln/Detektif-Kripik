async function testDongle() {
  const result = await window.dongleAPI.check();

  if (result.valid) {
    console.log('Dongle valid!');
    console.log('Drive:', result.drive);
  } else {
    console.log('Akses ditolak:', result.message);
  }
}

testDongle();