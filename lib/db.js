import fs from 'fs';
import path from 'path';

// Nama file database lokal
const DB_FILE = path.resolve('database.json');

// Default config jika file belum ada
const DEFAULTS = {
    siteName: "StreamHub Indo",
    siteDescription: "Platform streaming drama pendek Asia dengan subtitle & dubbing Indonesia terlengkap.",
    logoUrl: "",
    adminPassword: "admin123", // <--- PASSWORD DEFAULT BARU
    activeApis: ["NetShort", "DramaBox"]
};

export const connectDB = async () => {
    console.log("📂 Menggunakan Database Lokal (JSON File)");
    // Cek apakah file db ada, kalau tidak buat baru
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULTS, null, 2));
        console.log("✨ Database baru 'database.json' berhasil dibuat.");
    }
};

// Simulasi Model Mongoose tapi versi File Lokal
export class Settings {
    constructor(data) {
        Object.assign(this, { ...DEFAULTS, ...data });
    }

    // Fungsi cari data (Membaca file)
    static async findOne() {
        try {
            if (!fs.existsSync(DB_FILE)) return null;
            const raw = fs.readFileSync(DB_FILE, 'utf-8');
            const data = JSON.parse(raw);
            return new Settings(data);
        } catch (e) {
            console.error("Error baca DB:", e);
            return null;
        }
    }

    // Fungsi buat data baru
    static async create(data) {
        const newSettings = new Settings(data);
        await newSettings.save();
        return newSettings;
    }

    // Fungsi simpan perubahan (Menulis ke file)
    async save() {
        // Simpan object ini ke file database.json
        fs.writeFileSync(DB_FILE, JSON.stringify(this, null, 2));
        return this;
    }
}