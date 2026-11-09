// Mengambil elemen-elemen penting dari index.html
const pageContainer = document.getElementById("page-container"); // area utama (workspace)
const sidebarDocs = document.getElementById("sidebar-docs"); // tempat daftar dokumen di sidebar

const tabTools = document.getElementById("tab-tools"); // tab Tools di bawah
const tabAdd = document.getElementById("tab-add"); // tab Add di bawah
const tabRantai = document.getElementById("tab-rantai"); // tab Rantai Bukti di bawah
const tabFileTambahan = document.getElementById("tab-file-tambahan");

const pageMap = {
    tools: "tools.html",
    add: "add-file.html",
    rantai: "rantai-bukti.html",
    fileTambahan: "file-tambahan.html"
};

const dokumenList = [
    { nama: "Briefing", path: "./assets/documents/Brief.txt" },
    { nama: "Surat Mr.PS", path: "./assets/documents/Surat_PS.txt" },
    { nama: "Rekaman Rahasia", tipe: "rekaman" },
    { nama: "Dossier Tersangka", tipe: "dossier" },
    { nama: "Tempat Kejadian Perkara", tipe: "tkp" },
];

// Gambar ikon dokumen (dipakai ulang untuk semua item sidebar)
const IKON_DOKUMEN = `
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
`;

// Membaca isi file teks dari path tertentu
function bacaTeks(path) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest(); // alat bawaan browser untuk membaca file
        xhr.open("GET", path); // siapkan permintaan baca file
        xhr.onload = () => {
            // file lokal kadang berstatus 0 saat berhasil, jadi 0 dan 200 dianggap sukses
            if (xhr.status === 0 || xhr.status === 200) {
                resolve(xhr.responseText); // kirim isi teks sebagai hasil
            } else {
                reject(new Error(`File tidak ditemukan: ${path}`)); // status lain = gagal
            }
        };
        xhr.onerror = () => reject(new Error(`Gagal membaca file: ${path}`)); // error jaringan/akses
        xhr.send(); // kirim permintaan
    });
}

// Menggambar daftar dokumen di sidebar; namaAktif = dokumen yang sedang dibuka (kuning)
function buatSidebar(namaAktif = null) {
    sidebarDocs.innerHTML = ""; // kosongkan dulu supaya tidak dobel

    dokumenList.forEach((dok) => {
        const aktif = dok.nama === namaAktif; // true kalau dokumen ini yang sedang dibuka

        const item = document.createElement("div"); // buat satu item sidebar
        item.className =
            "flex flex-col items-center cursor-pointer transition-transform active:scale-95 " +
            (aktif ? "text-yellow-500" : "text-gray-500 hover:text-gray-300"); // warna sesuai status

        item.innerHTML = `
            <div class="w-12 h-14 rounded flex items-center justify-center mb-2 ${
                aktif
                    ? "border-2 border-yellow-500 bg-[#1e2025]"
                    : "border border-gray-600"
            }">
                ${IKON_DOKUMEN}
            </div>
            <span class="text-xs text-center break-all">${dok.nama}</span>
        `; // isi item: kotak ikon + nama file

        item.addEventListener("click", () => bukaDokumen(dok)); // klik = buka dokumen ini
        sidebarDocs.appendChild(item); // masukkan item ke sidebar
    });
}

function renderBriefMarkdown(markdown) {
    const escapeHTML = (text) => text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const formatInline = (text) => {
        return escapeHTML(text)
            .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em class='text-gray-400'>$1</em>");
    };

    const lines = markdown.split(/\r?\n/);
    let html = "";
    let inList = false;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            if (inList) {
                html += "</ol>";
                inList = false;
            }
            continue;
        }

        if (line === "---") {
            html += "<hr class='border-gray-700 my-5'>";
        } else if (line.startsWith("# ")) {
            html += `<h1 class="text-2xl font-bold text-white tracking-widest mb-2">${formatInline(line.slice(2))}</h1>`;
        } else if (line.startsWith("## ")) {
            html += `<h2 class="text-sm font-semibold text-yellow-500 tracking-[0.2em] mb-5">${formatInline(line.slice(3))}</h2>`;
        } else if (line.startsWith("### ")) {
            html += `<h3 class="text-yellow-500 font-semibold text-sm uppercase tracking-wider mt-6 mb-3">${formatInline(line.slice(4))}</h3>`;
        } else if (/^\d+\.\s/.test(line)) {
            if (!inList) {
                html += "<ol class='list-decimal list-inside space-y-3 text-gray-300 text-sm leading-relaxed ml-2'>";
                inList = true;
            }
            html += `<li>${formatInline(line.replace(/^\d+\.\s/, ""))}</li>`;
        } else {
            if (inList) {
                html += "</ol>";
                inList = false;
            }
            html += `<p class="text-gray-300 text-sm leading-relaxed mb-3">${formatInline(line)}</p>`;
        }
    }

    if (inList) html += "</ol>";

    return html;
}

async function bukaDokumen(dok) {
    resetNavigation();
    buatSidebar(dok.nama);

    pageContainer.innerHTML = `
        <div class="flex-1 flex items-center justify-center text-gray-500">
            Membuka dokumen...
        </div>
    `;

    try {
        // Surat PS memiliki proses pembukaan khusus

        // Rekaman memiliki halaman dan proses pembukaan khusus
        if (dok.tipe === "rekaman") {
            const content = await window.pageAPI.loadPage("rekaman.html");
            pageContainer.innerHTML = content;
            aktifkanRekaman();
            return;
        }

        if (dok.tipe === "dossier") {
            const content = await window.pageAPI.loadPage("dossier.html");
            pageContainer.innerHTML = content;
            aktifkanDossier();
            return;
        }

        if (dok.tipe === "tkp") {
            const content = await window.pageAPI.loadPage("tkp.html");
            pageContainer.innerHTML = content;
            aktifkanTKP();
            return;
        }

        if (dok.path === "./assets/documents/Surat_PS.txt") {
            const data = await window.cryptoAPI.getSuratPS();

            pageContainer.innerHTML = `
                <div class="bg-[#1a1c23] border border-gray-700 rounded-xl flex-1 flex flex-col shadow-2xl">
                    <div class="flex items-center p-4 border-b border-gray-800">
                        <h2 class="text-white font-semibold tracking-wide">
                            SURAT PRIBADI MR. PS
                        </h2>
                    </div>

                    <div class="p-6 flex-1 overflow-y-auto space-y-5">
                        <div class="bg-[#12141a] border border-gray-700 rounded-lg p-5">
                            <h3 class="text-yellow-500 font-semibold mb-3">Informasi Dokumen</h3>
                            <p class="text-gray-300 text-sm">Kode Dokumen: DK-014/PS</p>
                            <p class="text-gray-300 text-sm">Pemilik: Mr. PS</p>
                            <p class="text-gray-300 text-sm">Status: Barang Bukti</p>
                        </div>

                        <div class="bg-[#12141a] border border-gray-700 rounded-lg p-5">
                            <h3 class="text-yellow-500 font-semibold mb-3">Catatan Barang Bukti</h3>
                            <p class="text-gray-300 text-sm leading-relaxed">
                                Dokumen ini telah diamankan menggunakan enkripsi berlapis.
                                Diperlukan analisis kriptografi untuk membaca isi aslinya.
                            </p>
                        </div>

                        <div class="bg-[#12141a] border border-gray-700 rounded-lg p-5">
                            <h3 class="text-white font-semibold mb-4">
                                Petunjuk Kriptografi
                            </h3>

                            <div class="space-y-4">
                                <div>
                                    <h4 class="text-yellow-500 font-semibold text-sm mb-2">
                                        1. AES-256-GCM
                                    </h4>
                                    <p class="text-gray-400 text-sm leading-relaxed">
                                        Perhatikan kode dokumen,
                                        hilangkan tanda baca untuk menemukan kata sandinya.
                                        Gunakan algoritma AES-256-GCM dengan metode dekripsi.
                                    </p>
                                </div>

                                <div class="border-t border-gray-700 pt-4">
                                    <h4 class="text-yellow-500 font-semibold text-sm mb-2">
                                        2. Vigenère Cipher
                                    </h4>
                                    <p class="text-gray-400 text-sm leading-relaxed">
                                        Setelah lapisan pertama terbuka, pesan masih berupa
                                        ciphertext. Perhatikan petunjuk lokasi kejadian.
                                        Nama sebuah kota dapat menjadi kunci untuk membaca
                                        pesan berikutnya menggunakan metode Vigenère.
                                    </p>
                                </div>

                                <div class="border-t border-gray-700 pt-4">
                                    <h4 class="text-yellow-500 font-semibold text-sm mb-2">
                                        3. Caesar Cipher
                                    </h4>
                                    <p class="text-gray-400 text-sm leading-relaxed">
                                        Jika pesan masih belum terbaca setelah tahap kedua,
                                        berarti masih ada satu lapisan terakhir.
                                        Perhatikan pergeseran alfabet dan analisis pola
                                        perubahan huruf untuk menemukan pesan aslinya.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="bg-[#12141a] border border-gray-700 rounded-lg p-5">
                            <h3 class="text-yellow-500 font-semibold mb-3">
                                Data Terenkripsi AES
                            </h3>
                            <p class="text-gray-400 text-sm mb-3">
                                Salin ciphertext berikut dan gunakan menu Tools
                                untuk melakukan dekripsi.
                            </p>
                            <pre id="ciphertext-aes-surat"
                                class="text-gray-300 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all select-text"></pre>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById("ciphertext-aes-surat").textContent =
                JSON.stringify(data.encryptedData, null, 2);

            return;
        }

        if (dok.tipe === "gambar-hasil") {
            const konten = document.getElementById("konten-dokumen");

            konten.innerHTML = `
                <div class="p-6">
                    <h2 class="text-xl font-bold mb-4">${dok.nama}</h2>
                    <img
                        src="file://${dok.path.replace(/\\/g, "/")}"
                        alt="${dok.nama}"
                        class="max-w-full max-h-[600px] mx-auto rounded-lg"
                    >
                </div>
            `;

            return;
        }
        // Dokumen biasa tetap dibuka seperti sebelumnya
        const isi = await bacaTeks(dok.path);

        pageContainer.innerHTML = `
            <div class="bg-[#1a1c23] border border-gray-700 rounded-xl flex-1 flex flex-col shadow-2xl">
                <div class="flex items-center p-4 border-b border-gray-800">
                    <h2 class="text-white font-semibold tracking-wide">${dok.nama}</h2>
                </div>
                <div class="p-6 flex-1 overflow-y-auto">
                    <div class="bg-[#12141a] border border-gray-700 rounded-lg p-4">
                        <pre id="isi-dokumen" class="text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words select-text"></pre>
                    </div>
                </div>
            </div>
        `;

        const elemenDokumen = document.getElementById("isi-dokumen");
        if (dok.path === "./assets/documents/Brief.txt") {
            elemenDokumen.innerHTML = renderBriefMarkdown(isi);
        } else {
            elemenDokumen.textContent = isi;
        }
    } catch (error) {
        console.error("Gagal membuka dokumen:", error);

        pageContainer.innerHTML = `
            <div class="text-red-400 p-4">
                <h2 class="font-bold mb-2">Gagal membuka dokumen</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Reset navigasi tab bawah
function resetNavigation() {
    [tabTools, tabAdd, tabRantai, tabFileTambahan].forEach((tab) => {
        tab.classList.remove("active"); // hapus tanda aktif dari semua tab
    });
}

// MENAMPILKAN DATA BLOCKCHAIN
async function muatRantaiBukti() {
    const daftarBlok = document.getElementById("daftar-blok");
    const totalBlok = document.getElementById("total-blok");
    const statusRantai = document.getElementById("status-rantai");
    const hasilVerifikasi = document.getElementById("hasil-verifikasi-rantai");
    const daftarVerifikasi = document.getElementById("daftar-verifikasi-bukti");
    const tombolVerifikasi = document.getElementById("btn-verifikasi-rantai");
    const tombolDaftarkan = document.getElementById("btn-daftarkan-bukti");

    try {
        if (tombolDaftarkan) {
            tombolDaftarkan.onclick = async () => {
                tombolDaftarkan.disabled = true;
                tombolDaftarkan.textContent = "Memproses...";

                try {
                    const result = await window.blockchainAPI.addEvidence({
                        category: "Barang Bukti",
                        description: "Bukti investigasi Detektif Kripik"
                    });

                    if (result.cancelled) return;

                    if (!result.success) {
                        throw new Error(result.message || "Gagal mendaftarkan bukti.");
                    }

                    alert("Barang bukti berhasil didaftarkan ke blockchain!");
                    await muatRantaiBukti();

                } catch (error) {
                    alert("Gagal mendaftarkan bukti: " + error.message);
                } finally {
                    tombolDaftarkan.disabled = false;
                    tombolDaftarkan.textContent = "+ Daftarkan Bukti";
                }
            };
        }
        const chain = await window.blockchainAPI.getChain();

        totalBlok.textContent = chain.length;
        daftarBlok.innerHTML = "";
        daftarVerifikasi.innerHTML = "";

        if (chain.length === 0) {
            daftarBlok.textContent = "Belum ada bukti yang didaftarkan.";
            daftarVerifikasi.textContent = "Belum ada bukti untuk diverifikasi.";
        }

        chain.forEach((block) => {
            // Membuat kartu blok
            const kartu = document.createElement("div");
            kartu.className =
                "bg-[#12141a] border border-gray-700 rounded-lg p-4 min-w-[230px] max-w-[260px]";

            const judul = document.createElement("h4");
            judul.className = "font-bold text-white mb-2";
            judul.textContent = `Blok #${block.index}`;

            const namaFile = document.createElement("p");
            namaFile.className = "text-sm text-gray-300 mb-3";
            namaFile.textContent = block.evidence.fileName;

            const kategori = document.createElement("p");
            kategori.className = "text-xs text-gray-500 mb-2";
            kategori.textContent = `Kategori: ${block.evidence.category}`;

            const deskripsi = document.createElement("p");
            deskripsi.className = "text-xs text-gray-400 mb-2";
            deskripsi.textContent = `Deskripsi: ${
                block.evidence.description || "Tidak ada deskripsi"
            }`;

            const waktu = document.createElement("p");
            waktu.className = "text-xs text-gray-500 mb-3";

            waktu.textContent = `Waktu pendaftaran: ${
                new Date(block.timestamp).toLocaleString("id-ID")
            }`;

            const hashLabel = document.createElement("p");
            hashLabel.className = "text-xs text-gray-500";
            hashLabel.textContent = "Hash blok";

            const hash = document.createElement("p");
            hash.className = "text-xs text-gray-400 font-mono break-all mb-3";
            hash.textContent = block.hash;

            const previous = document.createElement("p");
            previous.className = "text-xs text-gray-500 break-all";
            previous.textContent = `Previous Hash: ${block.previousHash}`;

            kartu.append(judul, namaFile, kategori, deskripsi, waktu, hashLabel, hash, previous);
            daftarBlok.appendChild(kartu);

            // Tombol verifikasi setiap bukti
            const item = document.createElement("div");
            item.className =
                "bg-[#12141a] border border-gray-700 rounded-lg p-4 flex flex-wrap justify-between items-center gap-3";

            const info = document.createElement("div");

            const nama = document.createElement("p");
            nama.className = "text-white font-semibold";
            nama.textContent = block.evidence.fileName;

            const keterangan = document.createElement("p");
            keterangan.className = "text-gray-500 text-xs";
            keterangan.textContent = `Blok #${block.index} • ${block.evidence.category}`;

            info.append(nama, keterangan);

            const tombol = document.createElement("button");
            tombol.className =
                "bg-[#dcb059] hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg";
            tombol.textContent = "Verifikasi Bukti";

            const hasil = document.createElement("p");
            hasil.className = "w-full text-sm text-gray-400";

            tombol.addEventListener("click", async () => {
                tombol.disabled = true;
                tombol.textContent = "Memeriksa...";

                try {
                    const result = await window.blockchainAPI.verifyEvidence(
                        block.evidence.id
                    );

                    hasil.textContent = result.message;
                    hasil.className = result.valid
                        ? "w-full text-sm text-green-400"
                        : "w-full text-sm text-red-400";
                } catch (error) {
                    hasil.textContent = error.message;
                    hasil.className = "w-full text-sm text-red-400";
                } finally {
                    tombol.disabled = false;
                    tombol.textContent = "Verifikasi Bukti";
                }
            });

            item.append(info, tombol, hasil);
            daftarVerifikasi.appendChild(item);
        });

        // Tombol verifikasi seluruh rantai
        tombolVerifikasi.onclick = async () => {
            tombolVerifikasi.disabled = true;
            tombolVerifikasi.textContent = "Memverifikasi...";

            try {
                const result = await window.blockchainAPI.verifyChain();

                statusRantai.textContent = result.valid ? "VALID" : "TIDAK VALID";
                statusRantai.className = result.valid
                    ? "text-sm font-bold text-green-400"
                    : "text-sm font-bold text-red-400";

                hasilVerifikasi.classList.remove("hidden");
                hasilVerifikasi.className = result.valid
                    ? "border border-green-800 bg-[#122019] rounded-lg p-4 mb-4"
                    : "border border-red-800 bg-[#1c1214] rounded-lg p-4 mb-4";

                hasilVerifikasi.textContent = result.message;
            } catch (error) {
                hasilVerifikasi.classList.remove("hidden");
                hasilVerifikasi.textContent = error.message;
            } finally {
                tombolVerifikasi.disabled = false;
                tombolVerifikasi.textContent = "Verifikasi Rantai";
            }
        };

    } catch (error) {
        console.error("Gagal memuat blockchain:", error);
        daftarBlok.textContent = "Gagal mengambil data blockchain: " + error.message;
    }
}

function aktifkanAddFile() {
    const inputPesan = document.getElementById("pesan-rahasia");
    const tombolPilih = document.getElementById("pilih-gambar");
    const tombolSimpan = document.getElementById("btn-simpan-steganografi");
    const status = document.getElementById("status-steganografi");
    const preview = document.getElementById("preview-gambar");
    const teksPilih = document.getElementById("teks-pilih-gambar");

    if (!inputPesan || !tombolPilih || !tombolSimpan ||
        !status || !preview || !teksPilih) return;

    let gambarTerpilih = false;

    tombolPilih.addEventListener("click", async () => {
        try {
            const hasil = await window.cryptoAPI.selectImage();

            if (hasil.cancelled) {
                status.textContent = "Pemilihan gambar dibatalkan.";
                return;
            }

            if (hasil.success) {
                gambarTerpilih = true;
                preview.src = hasil.preview;
                preview.classList.remove("hidden");
                teksPilih.textContent = hasil.fileName;
                status.textContent = "Gambar berhasil dipilih. Masukkan pesan lalu klik Save.";
            }
        } catch (error) {
            console.error(error);
            status.textContent = "Gagal memilih gambar: " + error.message;
        }
    });

    tombolSimpan.addEventListener("click", async () => {
        const pesan = inputPesan.value.trim();

        if (!pesan) {
            status.textContent = "Masukkan pesan rahasia terlebih dahulu.";
            return;
        }

        if (!gambarTerpilih) {
            status.textContent = "Pilih gambar PNG terlebih dahulu.";
            return;
        }

        tombolSimpan.disabled = true;
        tombolSimpan.textContent = "Memproses...";

        try {
            const hasil = await window.cryptoAPI.embedImage(pesan);

            if (hasil.cancelled) {
                status.textContent = "Penyimpanan dibatalkan.";
            } else if (hasil.success) {
                status.textContent = "Berhasil! Pesan rahasia sudah disisipkan ke gambar.";
                inputPesan.value = "";
                gambarTerpilih = false;
            } else {
                status.textContent = hasil.message || "Gagal menyisipkan pesan.";
            }
        } catch (error) {
            console.error("Gagal melakukan steganografi:", error);
            status.textContent = "Gagal: " + error.message;
        } finally {
            tombolSimpan.disabled = false;
            tombolSimpan.textContent = "Save";
        }
    });
}

async function muatFileTambahan() {
    const daftarContainer = document.getElementById("daftar-file-tambahan");
    const previewContainer = document.getElementById("preview-file-tambahan");
    const tombolExtract = document.getElementById("btn-extract-file");
    const hasilExtract = document.getElementById("hasil-extract-file");

    if (!daftarContainer || !previewContainer || !tombolExtract || !hasilExtract) return;

    let fileTerpilihId = null;

    tombolExtract.disabled = true;

    try {
        const daftarFile = await window.cryptoAPI.listAddedImages();

        daftarContainer.innerHTML = "";

        if (!daftarFile.length) {
            daftarContainer.textContent = "Belum ada file tambahan.";
            return;
        }

        daftarFile.forEach((file) => {
            const tombol = document.createElement("button");

            tombol.textContent = file.fileName;
            tombol.className =
                "block w-full rounded-lg border border-gray-700 p-3 text-left text-sm text-gray-300 hover:bg-gray-700";

            tombol.addEventListener("click", async () => {
                try {
                    const gambar = await window.cryptoAPI.readAddedImage(file.id);

                    fileTerpilihId = file.id;
                    tombolExtract.disabled = false;

                    previewContainer.innerHTML = "";

                    const img = document.createElement("img");
                    img.src = gambar;
                    img.alt = file.fileName;
                    img.className = "max-h-96 max-w-full rounded-lg object-contain";

                    previewContainer.appendChild(img);

                    hasilExtract.textContent =
                        "Klik tombol Extract Pesan Rahasia untuk membaca isi pesan.";
                } catch (error) {
                    previewContainer.textContent =
                        "Gagal membuka gambar: " + error.message;
                }
            });

            daftarContainer.appendChild(tombol);
        });

    } catch (error) {
        daftarContainer.textContent =
            "Gagal memuat daftar file: " + error.message;
    }

    tombolExtract.addEventListener("click", async () => {
        if (!fileTerpilihId) return;

        tombolExtract.disabled = true;
        tombolExtract.textContent = "Sedang mengekstrak...";

        try {
            const hasil = await window.cryptoAPI.extractImage(fileTerpilihId);

            hasilExtract.textContent = hasil.message;

        } catch (error) {
            hasilExtract.textContent =
                "Gagal mengekstrak pesan: " + error.message;

        } finally {
            tombolExtract.disabled = false;
            tombolExtract.textContent = "Extract Pesan Rahasia";
        }
    });
}

function aktifkanTools() {
    const modeEncrypt = document.getElementById("mode-encrypt");
    const modeDecrypt = document.getElementById("mode-decrypt");
    const input = document.getElementById("input-crypto");
    const algoritma = document.getElementById("algorithm-crypto");
    const key = document.getElementById("key-crypto");
    const labelInput = document.getElementById("label-input");
    const labelKey = document.getElementById("label-key");
    const tombolProses = document.getElementById("btn-proses-crypto");
    const hasil = document.getElementById("hasil-crypto");
    const status = document.getElementById("status-crypto");
    const tombolCopy = document.getElementById("btn-copy-crypto");

    if (!modeEncrypt || !modeDecrypt || !input || !algoritma ||
        !key || !tombolProses || !hasil || !status || !tombolCopy) return;

    let operation = "encrypt";
    let dataAESUntukDisalin = null;

    function perbaruiMode() {
        const encrypt = operation === "encrypt";

        labelInput.textContent = encrypt ? "Plaintext" : "Ciphertext";
        input.placeholder = encrypt
            ? "Masukkan plaintext..."
            : "Masukkan ciphertext...";

        tombolProses.textContent = encrypt ? "Proses Enkripsi" : "Proses Dekripsi";

        modeEncrypt.className = encrypt
            ? "flex-1 py-3 rounded-lg border-2 border-yellow-500 text-yellow-500 font-semibold bg-[#1e2025]"
            : "flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 font-semibold";

        modeDecrypt.className = !encrypt
            ? "flex-1 py-3 rounded-lg border-2 border-yellow-500 text-yellow-500 font-semibold bg-[#1e2025]"
            : "flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 font-semibold";

        dataAESUntukDisalin = null;
        hasil.value = "";
        status.textContent = "Siap memproses teks.";
    }

    function perbaruiKunci() {
        if (algoritma.value === "caesar") {
            labelKey.textContent = "Kunci (angka pergeseran)";
            key.placeholder = "Contoh: 3";
            key.type = "number";
        } else if (algoritma.value === "vigenere") {
            labelKey.textContent = "Kunci (huruf A-Z)";
            key.placeholder = "Contoh: BOGOR";
            key.type = "text";
        } else {
            labelKey.textContent = "Kata Kunci AES";
            key.placeholder = "Masukkan kata kunci rahasia...";
            key.type = "password";
        }
    }

    modeEncrypt.addEventListener("click", () => {
        operation = "encrypt";
        perbaruiMode();
    });

    modeDecrypt.addEventListener("click", () => {
        operation = "decrypt";
        perbaruiMode();
    });

    algoritma.addEventListener("change", () => {
        dataAESUntukDisalin = null;
        hasil.value = "";
        perbaruiKunci();
    });
    tombolProses.addEventListener("click", async () => {
        const text = input.value;
        const secretKey = key.value.trim();
        const selectedAlgorithm = algoritma.value;

        if (!text.trim()) {
            status.textContent = "Masukkan teks terlebih dahulu.";
            return;
        }

        if (!secretKey) {
            status.textContent = "Masukkan kunci terlebih dahulu.";
            return;
        }

        if (selectedAlgorithm === "caesar" && !/^-?\d+$/.test(secretKey)) {
            status.textContent = "Kunci Caesar harus berupa angka.";
            return;
        }

        tombolProses.disabled = true;
        tombolProses.textContent = "Memproses...";

        try {
            let response;

            if (selectedAlgorithm === "aes") {
                response = await window.cryptoAPI.aes({
                    operation: operation,
                    text: text,
                    password: secretKey
                });
            } else {
                response = await window.cryptoAPI.classical({
                    algorithm: selectedAlgorithm,
                    operation: operation,
                    text: text,
                    key: selectedAlgorithm === "caesar"
                        ? Number(secretKey)
                        : secretKey
                });
            }

            if (selectedAlgorithm === "aes" && operation === "encrypt") {
                const dataAES = JSON.parse(response);

                dataAESUntukDisalin = response;
                hasil.value = dataAES.ciphertext;

                status.textContent =
                    "Enkripsi berhasil. Salin Hasil untuk mendapatkan seluruh data AES.";
            } else {
                dataAESUntukDisalin = null;
                hasil.value = response;
                status.textContent = "Proses berhasil.";
            }
        } catch (error) {
            hasil.value = "";
            status.textContent = "Gagal: " + error.message;

        } finally {
            tombolProses.disabled = false;
            tombolProses.textContent =
                operation === "encrypt"
                    ? "Proses Enkripsi"
                    : "Proses Dekripsi";
        }
    });

    tombolCopy.addEventListener("click", async () => {
        const teksSalinan = dataAESUntukDisalin || hasil.value;

        if (!teksSalinan) {
            status.textContent = "Belum ada hasil untuk disalin.";
            return;
        }

        try {
            await navigator.clipboard.writeText(teksSalinan);

            status.textContent = dataAESUntukDisalin
                ? "Seluruh data AES berhasil disalin."
                : "Hasil berhasil disalin.";
        } catch (error) {
            status.textContent = "Gagal menyalin hasil.";
        }
    });

    perbaruiKunci();
}


async function aktifkanRekaman() {
    const inputPassword = document.getElementById("password-rekaman");
    const tombolBuka = document.getElementById("btn-buka-rekaman");
    const status = document.getElementById("status-rekaman");
    const panelPemutar = document.getElementById("panel-pemutar");
    const pemutar = document.getElementById("pemutar-rekaman");
    const panelEkstraksi = document.getElementById("panel-ekstraksi");
    const tombolEkstrak = document.getElementById("btn-ekstrak-audio");
    const hasil = document.getElementById("hasil-ekstraksi");

    // Membuka rekaman dengan password
    tombolBuka.addEventListener("click", async () => {
        tombolBuka.disabled = true;
        status.textContent = "Memverifikasi password...";

        try {
            const akses = await window.cryptoAPI.unlockAudio(
                inputPassword.value
            );

            if (!akses.success) {
                throw new Error(akses.message || "Akses ditolak.");
            }

            const audioBase64 = await window.cryptoAPI.getAudio();

            pemutar.src = `data:audio/wav;base64,${audioBase64}`;

            panelPemutar.classList.remove("hidden");
            status.textContent = "Rekaman berhasil dibuka. Silakan dengarkan sampai selesai.";

        } catch (error) {
            status.textContent = error.message;
        } finally {
            tombolBuka.disabled = false;
        }
    });

    // Aktif setelah audio selesai diputar
    pemutar.addEventListener("ended", async () => {
        try {
            await window.cryptoAPI.markAudioListened();

            panelEkstraksi.classList.remove("hidden");
            status.textContent = "Rekaman selesai didengarkan. Pesan tersembunyi siap diekstrak.";
        } catch (error) {
            status.textContent = error.message;
        }
    });

    // Mengekstrak pesan tersembunyi
    tombolEkstrak.addEventListener("click", async () => {
        tombolEkstrak.disabled = true;
        hasil.textContent = "Mengekstrak pesan...";

        try {
            const response = await window.cryptoAPI.extractAudio();

            if (!response.success) {
                throw new Error(response.message || "Ekstraksi gagal.");
            }

            hasil.textContent = `Pesan berhasil ditemukan: ${response.message}`;
        } catch (error) {
            hasil.textContent = `Gagal: ${error.message}`;
        } finally {
            tombolEkstrak.disabled = false;
        }
    });
}

async function aktifkanDossier() {
    const inputPassword = document.getElementById("password-dossier");
    const tombolBuka = document.getElementById("btn-buka-dossier");
    const status = document.getElementById("status-dossier");
    const panelKunci = document.getElementById("dossier-lock");
    const panelKonten = document.getElementById("dossier-content");
    const infoKasus = document.getElementById("info-kasus");
    const daftarTersangka = document.getElementById("daftar-tersangka");

    tombolBuka.addEventListener("click", async () => {
        tombolBuka.disabled = true;
        status.textContent = "Membuka berkas dossier...";

        try {
            const data = await window.cryptoAPI.decryptDossier(
                inputPassword.value
            );

            if (!data || !data.case || !Array.isArray(data.suspects)) {
                throw new Error("Format dossier tidak valid.");
            }

            infoKasus.innerHTML = `
                <h2 class="text-xl font-bold text-amber-400 mb-4">
                    ${data.case.title}
                </h2>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <p class="text-gray-400">Tanggal:
                        <span class="text-white">${data.case.date}</span>
                    </p>
                    <p class="text-gray-400">Lokasi:
                        <span class="text-white">${data.case.location}</span>
                    </p>
                    <p class="text-gray-400">Korban:
                        <span class="text-white">${data.case.victim}</span>
                    </p>
                </div>
            `;

            daftarTersangka.innerHTML = "";

            data.suspects.forEach((tersangka) => {
                const namaFile = `${tersangka.name}_Rahasia.png`;

                const kartu = document.createElement("div");
                kartu.className = "bg-gray-800 border border-gray-700 rounded-xl overflow-hidden";

                kartu.innerHTML = `
                    <img
                        src="./assets/images/${namaFile}"
                        alt="Foto ${tersangka.name}"
                        class="w-full h-56 object-cover"
                    >
                    <div class="p-5">
                        <h3 class="text-lg font-bold text-amber-400">
                            ${tersangka.name}
                        </h3>
                        <p class="text-sm text-gray-400 mt-1">
                            ${tersangka.relationship}
                        </p>
                        <p class="text-sm text-gray-300 mt-3">
                            ${tersangka.description}
                        </p>
                        <p class="text-xs text-gray-500 mt-3">
                            Pertemuan terakhir: ${tersangka.lastMeeting}
                        </p>
                        <button
                            class="btn-ekstrak-lsb w-full mt-4 p-3 rounded-lg bg-amber-600 hover:bg-amber-700 font-semibold"
                            data-nama="${tersangka.name}"
                        >
                            Ekstrak Pesan Rahasia
                        </button>

                        <p class="status-ekstrak text-sm mt-2 text-center text-gray-400"></p>
                    </div>
                `;

                daftarTersangka.appendChild(kartu);
            });

            panelKunci.classList.add("hidden");
            panelKonten.classList.remove("hidden");

        } catch (error) {
            status.textContent = error.message;
        } finally {
            tombolBuka.disabled = false;
        }
    });

    // Mengaktifkan tombol ekstraksi pesan pada foto tersangka
    daftarTersangka.addEventListener("click", async (event) => {
        const tombol = event.target.closest(".btn-ekstrak-lsb");

        if (!tombol) return;

        const nama = tombol.dataset.nama;
        const kartu = tombol.closest("div.bg-gray-800");
        const status = kartu.querySelector(".status-ekstrak");

        tombol.disabled = true;
        status.textContent = "Mengekstrak pesan...";

        try {
            const hasil = await window.cryptoAPI.extractDossierImage(
                `${nama}_Rahasia.png`
            );

            if (!hasil.success) {
                throw new Error("Pesan gagal diekstrak.");
            }

            status.textContent = `Pesan rahasia: ${hasil.message}`;
            status.classList.remove("text-gray-400");
            status.classList.add("text-green-400");

        } catch (error) {
            status.textContent = error.message;
            status.classList.add("text-red-400");
        } finally {
            tombol.disabled = false;
        }
    });
}

// Mengaktifkan halaman Tempat Kejadian Perkara
async function aktifkanTKP() {
    const inputPassword = document.getElementById("password-tkp");
    const tombolBuka = document.getElementById("btn-buka-tkp");
    const statusTKP = document.getElementById("status-tkp");
    const panelLock = document.getElementById("tkp-lock");
    const kontenTKP = document.getElementById("tkp-content");

    const tombolEkstrak = document.getElementById("btn-ekstrak-tkp");
    const hasilEkstraksi = document.getElementById("hasil-ekstraksi-tkp");

    const panelPelaku = document.getElementById("panel-pilih-pelaku");
    const pilihanPelaku = document.getElementById("pilihan-pelaku");
    const tombolPeriksa = document.getElementById("btn-periksa-pelaku");
    const hasilPelaku = document.getElementById("hasil-pelaku");

    // Membuka berkas TKP menggunakan password TRAITOR
    tombolBuka.addEventListener("click", () => {
        const password = inputPassword.value.trim();

        if (password.toUpperCase() !== "TRAITOR") {
            statusTKP.textContent = "Kata sandi salah. Akses ditolak.";
            statusTKP.className = "text-sm text-center text-red-400 mt-3";
            return;
        }

        panelLock.classList.add("hidden");
        kontenTKP.classList.remove("hidden");
    });

    // Mengekstrak pesan tersembunyi dari foto TKP
    tombolEkstrak.addEventListener("click", async () => {
        tombolEkstrak.disabled = true;
        tombolEkstrak.textContent = "Mengekstrak pesan...";

        hasilEkstraksi.textContent = "";

        try {
            const hasil = await window.cryptoAPI.extractTKPImage();

            if (!hasil.success) {
                throw new Error("Ekstraksi pesan gagal.");
            }

            hasilEkstraksi.textContent =
                "Pesan tersembunyi: " + hasil.message;

            hasilEkstraksi.className =
                "text-sm text-center text-green-400 mt-3";

            panelPelaku.classList.remove("hidden");

        } catch (error) {
            hasilEkstraksi.textContent =
                "Gagal mengekstrak pesan: " + error.message;

            hasilEkstraksi.className =
                "text-sm text-center text-red-400 mt-3";
        } finally {
            tombolEkstrak.disabled = false;
            tombolEkstrak.textContent = "Ekstrak Pesan Rahasia";
        }
    });

    // Memeriksa identitas pelaku
    tombolPeriksa.addEventListener("click", () => {
        const pelaku = pilihanPelaku.value;

        if (!pelaku) {
            hasilPelaku.textContent = "Pilih tersangka terlebih dahulu.";
            hasilPelaku.className =
                "text-sm text-center text-yellow-400 mt-3";
            return;
        }

        if (pelaku === "Teddy") {
            hasilPelaku.textContent =
                "Benar! Teddy adalah pelaku yang dicari. Kasus berhasil dipecahkan.";

            hasilPelaku.className =
                "text-sm text-center text-green-400 mt-3 font-semibold";
        } else {
            hasilPelaku.textContent =
                "Jawaban belum tepat. Periksa kembali seluruh bukti yang ditemukan.";

            hasilPelaku.className =
                "text-sm text-center text-red-400 mt-3";
        }
    });
}

// Membuka halaman tab (Tools, Add, Rantai Bukti)
async function openPage(pageName, activeTab = null) {
    const fileName = pageMap[pageName]; // cari nama file HTML-nya

    if (!fileName) return; // kalau tidak terdaftar, berhenti

    resetNavigation(); // bersihkan tanda aktif lama
    buatSidebar(null); // tidak ada dokumen yang disorot saat di tab

    if (activeTab) {
        activeTab.classList.add("active"); // tandai tab yang dipilih
    }

    pageContainer.innerHTML = `
        <div class="flex-1 flex items-center justify-center text-gray-500">
            Memuat halaman...
        </div>
    `;

    try {
        const content = await window.pageAPI.loadPage(fileName);
        pageContainer.innerHTML = content;

        if (pageName === "rantai") {
            await muatRantaiBukti();
        }
        if (pageName === "add") {
            aktifkanAddFile();
        }
        if (pageName === "tools") {
            aktifkanTools();
        }
        if (pageName === "fileTambahan") {
            await muatFileTambahan();
        }
    } catch (error) {
        console.error("Gagal memuat halaman:", error);

        pageContainer.innerHTML = `
            <div class="text-red-400 p-4">
                <h2 class="font-bold mb-2">Gagal memuat halaman</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Event klik untuk tab bawah
tabTools.addEventListener("click", () => openPage("tools", tabTools));
tabAdd.addEventListener("click", () => openPage("add", tabAdd));
tabRantai.addEventListener("click", () => openPage("rantai", tabRantai));
tabFileTambahan.addEventListener("click", () => openPage("fileTambahan", tabFileTambahan));

// Saat aplikasi pertama dibuka, gambar daftar dokumen di sidebar
buatSidebar(null);