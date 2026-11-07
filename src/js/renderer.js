
const pageContainer = document.getElementById("page-container");

const sidebarFile = document.getElementById("sidebar-file");

const tabTools = document.getElementById("tab-tools");
const tabAdd = document.getElementById("tab-add");
const tabRantai = document.getElementById("tab-rantai");

// Daftar halaman
const pageMap = {
    surat: "surat.html",
    tools: "tools.html",
    add: "add-file.html",
    rantai: "rantai-bukti.html"
};

// Reset navigasi
function resetNavigation() {
    [tabTools, tabAdd, tabRantai].forEach(tab => {
        tab.classList.remove("active");
    });
}

// Membuka halaman
async function openPage(pageName, activeTab = null) {
    const fileName = pageMap[pageName];

    if (!fileName) return;

    resetNavigation();

    if (activeTab) {
        activeTab.classList.add("active");
    }

    pageContainer.innerHTML = `
        <div class="flex-1 flex items-center justify-center text-gray-500">
            Memuat halaman...
        </div>
    `;

    try {
        const content = await window.pageAPI.loadPage(fileName);

        pageContainer.innerHTML = content;

        if (pageName === "surat") {
            setupSuratPage();
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

// Interaksi halaman Surat Hendra
function setupSuratPage() {
    const btnDekripsi = document.getElementById("btn-dekripsi");

    if (!btnDekripsi) return;

    btnDekripsi.addEventListener("click", async () => {
        const key = document
            .getElementById("key-vigenere")
            .value.trim();

        const hasil = document.getElementById("hasil-dekripsi");

        const ciphertext = "QZJVAHNFTOLRKEM";

        if (!key) {
            hasil.textContent = "Kunci Vigenere tidak boleh kosong!";
            return;
        }

        hasil.textContent = "Memproses dekripsi...";

        try {
            if (window.api?.runCrypto) {
                const output = await window.api.runCrypto(
                    "vigenere.py",
                    ciphertext,
                    key
                );

                hasil.textContent = output;
            } else {
                hasil.textContent =
                    "Integrasi Python belum tersedia.";
            }

        } catch (error) {
            hasil.textContent = `Terjadi kesalahan: ${error.message}`;
        }
    });
}

// Event navigasi
tabTools.addEventListener("click", () => {
    openPage("tools", tabTools);
});

tabAdd.addEventListener("click", () => {
    openPage("add", tabAdd);
});

tabRantai.addEventListener("click", () => {
    openPage("rantai", tabRantai);
});

sidebarFile.addEventListener("click", () => {
    openPage("surat");
});
