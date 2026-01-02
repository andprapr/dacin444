import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js'; 
import { connectDB, Settings } from './lib/db.js';
import * as db from './lib/dramabox.js'; // Import logika Dramabox

const app = express();
const PORT = process.env.PORT || 4001;

// 1. Koneksi Database (Jika pakai MongoDB)
connectDB();

// 2. Middleware
app.use(cors()); // Mengizinkan akses dari domain lain (PENTING)
app.use(express.json());
app.use(express.static('public')); // Folder tempat file html/css/js frontend disimpan

// ==========================================
// A. RUTE SPESIAL (LANGSUNG DI ROOT)
// ==========================================

// 👉 Endpoint Download/Detail: /download/12345
app.get('/download/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        // Panggil fungsi detail dari library dramabox
        const result = await db.allepisode(bookId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

// ==========================================
// B. RUTE ADMIN (PANEL KONTROL)
// ==========================================

// 1. Ambil Config
app.get('/api/admin/config', async (req, res) => {
    try {
        let config = await Settings.findOne();
        if (!config) config = await Settings.create({});
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: "Gagal ambil config" });
    }
});

// 2. Login Admin
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    try {
        let config = await Settings.findOne();
        if (!config) config = await Settings.create({ adminPassword: "admin123" });

        if (config.adminPassword === password) {
            res.json({ success: true, message: "Login Berhasil" });
        } else {
            // Tampilkan password asli jika salah (Fitur 'Bocor Alus' untuk Admin Lupa Password)
            res.status(401).json({ success: false, message: `Password Salah! Password asli: ${config.adminPassword}` });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 3. Update Pengaturan
app.post('/api/admin/update-all', async (req, res) => {
    const { newName, newDesc, newLogo, newApis, password } = req.body; 
    try {
        const config = await Settings.findOne();
        if (!config || config.adminPassword !== password) return res.status(401).json({ success: false, message: "Akses Ditolak" });

        config.siteName = newName;
        config.siteDescription = newDesc;
        config.logoUrl = newLogo;
        config.activeApis = newApis;
        
        await config.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// C. RUTE UTAMA API (INTEGRASI NETSHORT & DRAMABOX)
// ==========================================

// Semua request ke /api/... akan diarahkan ke routes/api.js
// Ini menangani: /api/home, /api/search, /api/netshort/..., dll.
app.use('/api', apiRoutes); 

// Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Server Berjalan di: http://localhost:${PORT}`);
    console.log(`📡 Endpoint Home: http://localhost:${PORT}/api/home`);
});