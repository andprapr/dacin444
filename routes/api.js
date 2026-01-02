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
        res.status(500).json({ error: 'Server Error', message: error.message });
    }
};

// ==========================================
// A. JALUR ADMIN (HARUS DI PALING ATAS)
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

// ==========================================
// B. JALUR DRAMA (NETSHORT & DRAMABOX)
// ==========================================
router.get('/netshort/foryou', (req, res) => handleRequest(() => foryou(parseInt(req.query.page)||1), req, res));
router.get('/netshort/search', (req, res) => handleRequest(() => search(req.query.query), req, res));
router.get('/netshort/allepisode', (req, res) => handleRequest(() => allepisode(req.query.shortPlayId), req, res));

router.get('/dramabox/foryou', (req, res) => handleRequest(() => db.foryou(parseInt(req.query.page)||1), req, res));
router.get('/dramabox/search', (req, res) => handleRequest(() => db.search(req.query.query), req, res));
router.get('/dramabox/allepisode', (req, res) => handleRequest(() => db.allepisode(req.query.shortPlayId), req, res));

export default router;