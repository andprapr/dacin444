import { Router } from 'express';
import { Settings } from '../lib/db.js'; 
import { allepisode, search, foryou, theaters } from '../lib/netshort.js';
import * as db from '../lib/dramabox.js'; 

const router = Router();

// Helper Error Handler
const handleRequest = async (handler, req, res) => {
    try {
        const result = await handler(req);
        res.json(result);
    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: 'Server Error', message: error.message });
    }
};

// ==========================================
// 1. ENDPOINT DRAMABOX (CLEAN URL)
// ==========================================
// Struktur ini mengikuti referensi yang Anda minta:
// - /api/home
// - /api/search?q=keyword
// - /api/detail/12345

// Home / List Drama
router.get('/home', (req, res) => handleRequest(() => db.foryou(parseInt(req.query.page)||1), req, res));

// Search Drama (Mendukung parameter ?q= atau ?query=)
router.get('/search', (req, res) => handleRequest(() => db.search(req.query.q || req.query.query), req, res));

// Detail Drama (Menggunakan params /detail/100234)
router.get('/detail/:bookId', (req, res) => handleRequest(() => db.allepisode(req.params.bookId), req, res));

// Streaming / Chapter List (Opsional jika butuh list chapter terpisah)
router.get('/chapters/:bookId', (req, res) => handleRequest(() => db.allepisode(req.params.bookId), req, res));


// ==========================================
// 2. ENDPOINT NETSHORT (LEGACY)
// ==========================================
// Struktur asli Netshort:
// - /api/netshort/foryou
// - /api/netshort/search

router.get('/netshort/foryou', (req, res) => handleRequest(() => foryou(parseInt(req.query.page)||1), req, res));
router.get('/netshort/search', (req, res) => handleRequest(() => search(req.query.query), req, res));
router.get('/netshort/allepisode', (req, res) => handleRequest(() => allepisode(req.query.shortPlayId), req, res));


// ==========================================
// 3. ENDPOINT DRAMABOX (LEGACY PATH)
// ==========================================
// Jalur cadangan jika frontend index.html memanggil /api/dramabox/...

router.get('/dramabox/foryou', (req, res) => handleRequest(() => db.foryou(parseInt(req.query.page)||1), req, res));
router.get('/dramabox/search', (req, res) => handleRequest(() => db.search(req.query.query), req, res));
router.get('/dramabox/allepisode', (req, res) => handleRequest(() => db.allepisode(req.query.shortPlayId), req, res));


// ==========================================
// 4. JALUR ADMIN (CONFIG & SETTINGS)
// ==========================================

router.get('/admin/config', async (req, res) => {
    try {
        let config = await Settings.findOne();
        if (!config) config = await Settings.create({ siteName: "StreamHub Indo" }); 
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: "Gagal ambil config database" });
    }
});

router.post('/admin/update-name', async (req, res) => {
    const { newName, password } = req.body;
    try {
        const config = await Settings.findOne();
        if (config.adminPassword !== password) {
            return res.status(401).json({ success: false, message: "Password Salah!" });
        }
        config.siteName = newName;
        await config.save();
        res.json({ success: true, message: "Nama berhasil diganti!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Gagal simpan database." });
    }
});

// Update All Settings (Judul, Logo, Deskripsi)
router.post('/admin/update-all', async (req, res) => {
    const { newName, newDesc, newLogo, password } = req.body;
    try {
        const config = await Settings.findOne();
        if (config.adminPassword !== password) {
            return res.status(401).json({ success: false, message: "Password Salah!" });
        }
        config.siteName = newName;
        if(newDesc) config.siteDescription = newDesc;
        if(newLogo) config.logoUrl = newLogo;
        
        await config.save();
        res.json({ success: true, message: "Pengaturan berhasil disimpan!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

export default router;