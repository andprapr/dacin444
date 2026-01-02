import express from 'express';
import apiRoutes from './routes/api.js'; 
import { connectDB, Settings } from './lib/db.js';

const app = express();
const PORT = process.env.PORT || 4001;

// 1. Nyalakan Database
connectDB();

// 2. Middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());
app.use(express.static('public')); 

// ==========================================
// RUTE KHUSUS ADMIN (FULL CONTROL)
// ==========================================

// 1. AMBIL DATA CONFIG (GET) - Ini yang sebelumnya hilang!
app.get('/api/admin/config', async (req, res) => {
    try {
        let config = await Settings.findOne();
        // Jika database kosong, buat default otomatis
        if (!config) {
            config = await Settings.create({});
        }
        res.json(config);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Gagal ambil data" });
    }
});

// 2. LOGIN ADMIN (POST) - VERSI "BOCOR ALUS"
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    try {
        let config = await Settings.findOne();
        
        // Cek Database kosong/tidak
        if (!config) {
             // Buat baru jika kosong
            config = await Settings.create({ adminPassword: "admin123" });
        }

        if (config.adminPassword === password) {
            res.json({ success: true, message: "Login Berhasil" });
        } else {
            // === DISINI KITA BOCORKAN PASSWORDNYA KE LAYAR ===
            res.status(401).json({ 
                success: false, 
                message: `Password Salah! Password asli di DB adalah: ${config.adminPassword}` 
            });
        }
    } catch (e) {
        // === JIKA ERROR DB (TIMEOUT DLL), TAMPILKAN DI LAYAR JUGA ===
        res.status(500).json({ 
            success: false, 
            message: `Server Error: ${e.message}` 
        });
    }
});

// 3. UPDATE SEMUA DATA (POST)
app.post('/api/admin/update-all', async (req, res) => {
    // Tangkap deskripsi (newDesc) dari admin.html
    const { newName, newDesc, newLogo, newApis, password } = req.body; 
    
    try {
        const config = await Settings.findOne();
        if (!config || config.adminPassword !== password) {
            return res.status(401).json({ success: false, message: "Password Salah / Akses Ditolak" });
        }

        // Simpan semua field ke database
        config.siteName = newName;
        config.siteDescription = newDesc; // <--- INI WAJIB ADA
        config.logoUrl = newLogo;
        config.activeApis = newApis;
        
        await config.save();
        res.json({ success: true });
    } catch (e) {
        console.error("Gagal Update:", e);
        res.status(500).json({ success: false });
    }
});

// Sambungkan ke API lain (NetShort/DramaBox)
app.use('/api', apiRoutes); 

app.listen(PORT, () => {
    console.log(`🚀 Server Berjalan di: http://localhost:${PORT}`);
    console.log(`⚙️ Admin Panel: http://localhost:${PORT}/admin.html`);
});