import { Router } from 'express';
import { Settings } from '../lib/db.js'; 
import Dramabox from '../lib/dramabox-class.js'; 
import { allepisode as nsDetail, search as nsSearch, foryou as nsHome } from '../lib/netshort.js';

const router = Router();

// ==========================================
// A. ENDPOINT DINAMIS & V2
// ==========================================

// 1. Home
router.get('/home', async (req, res) => {
    try {
        const source = req.query.source || req.query.server || 'dramabox';
        if (source === 'netshort') {
            const result = await nsHome(parseInt(req.query.page) || 1);
            return res.json(result);
        } else {
            const dramabox = new Dramabox(req.query.lang || 'in');
            const result = await dramabox.getRecommendedBooks(req.query.page || 1);
            return res.json({ status: true, success: true, data: result.book, isMore: result.isMore });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 2. Search
router.get('/search', async (req, res) => {
    try {
        const source = req.query.source || req.query.server || 'dramabox';
        if (source === 'netshort') {
            const result = await nsSearch(req.query.q || req.query.query);
            return res.json(result);
        } else {
            const dramabox = new Dramabox(req.query.lang || 'in');
            const result = await dramabox.searchDrama(req.query.q || req.query.query || "");
            return res.json({ status: true, success: true, data: result.book });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// --- HELPER FUNCTION UNTUK DATA MERGING ---
// Fungsi ini menggabungkan data Detail (yang sering kosong) dengan data Chapter (yang lengkap)
const getFullDramaData = async (bookId, lang = 'in') => {
    const dramabox = new Dramabox(lang);
    
    // Request Detail & Chapter secara paralel
    const [rawDetail, rawChapters] = await Promise.all([
        dramabox.getRawDetail(bookId),
        dramabox.getRawChapters(bookId)
    ]);

    const detail = rawDetail?.data || {};
    const chapters = rawChapters?.data?.chapterList || [];
    // Data cadangan ada di header response chapter
    const fallbackInfo = rawChapters?.data || {};

    return {
        id: bookId,
        bookId: bookId,
        // Logika prioritas: Detail -> Falback (Chapter Header) -> Default
        name: detail.bookName || detail.name || fallbackInfo.bookName || "Judul Tidak Ditemukan",
        title: detail.bookName || detail.name || fallbackInfo.bookName || "Judul Tidak Ditemukan",
        
        cover: detail.coverWap || detail.cover || fallbackInfo.coverWap || "https://via.placeholder.com/300x450?text=No+Cover",
        poster: detail.coverWap || detail.cover || fallbackInfo.coverWap, // field 'poster' untuk beberapa frontend
        
        introduction: detail.introduction || detail.briefIntroduction || "Sinopsis belum tersedia.",
        desc: detail.introduction || detail.briefIntroduction || "Sinopsis belum tersedia.",
        description: detail.introduction || detail.briefIntroduction || "Sinopsis belum tersedia.",
        
        episode_count: chapters.length,
        chapters: chapters
    };
};

// 3. Detail Drama (Support V1 & V2)
// Menangani: /api/detail/:bookId DAN /api/detail/:bookId/v2
router.get(['/detail/:bookId', '/detail/:bookId/v2'], async (req, res) => {
    try {
        const source = req.query.source || req.query.server || 'dramabox';
        const { bookId } = req.params;

        if (source === 'netshort') {
            return res.json(await nsDetail(bookId));
        } 
        
        // Pakai fungsi helper di atas
        const finalData = await getFullDramaData(bookId, req.query.lang || 'in');
        
        return res.json({ 
            status: true, 
            success: true, 
            data: finalData 
        });

    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 4. Daftar Chapter
router.get('/chapters/:bookId', async (req, res) => {
    try {
        const dramabox = new Dramabox(req.query.lang || 'in');
        const raw = await dramabox.getRawChapters(req.params.bookId);
        res.json({ success: true, data: raw?.data?.chapterList || [] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 5. Dubbed
router.get('/dubbed', async (req, res) => {
    try {
        const dramabox = new Dramabox(req.query.lang || 'in');
        const result = await dramabox.getDubbedList(req.query.page || 1, req.query.size || 15);
        res.json(result);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 6. Stream
router.get('/stream', async (req, res) => {
    try {
        const dramabox = new Dramabox('in');
        const result = await dramabox.getStreamUrl(req.query.bookId, req.query.episode);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. Kategori & VIP (Opsional / Placeholder)
router.get('/vip', async (req, res) => {
    res.json({ success: true, message: "VIP endpoint placeholder" });
});
router.get('/categories', async (req, res) => {
    res.json({ success: true, data: [] }); // Isi nanti jika butuh
});


// ==========================================
// B. ENDPOINT LEGACY (Khusus Frontend Lama)
// ==========================================

router.get('/dramabox/foryou', async (req, res) => {
    try {
        const dramabox = new Dramabox('in');
        const result = await dramabox.getRecommendedBooks(parseInt(req.query.page) || 1);
        res.json({ status: true, success: true, data: result.book });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

router.get('/dramabox/search', async (req, res) => {
    try {
        const dramabox = new Dramabox('in');
        const result = await dramabox.searchDrama(req.query.query);
        res.json({ status: true, success: true, data: result.book });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// Popup Legacy (Endpoint ini biasanya dipanggil frontend lama)
router.get('/dramabox/allepisode', async (req, res) => {
    try {
         const bookId = req.query.shortPlayId;
         // Pakai helper yang sama agar popup legacy juga terisi
         const finalData = await getFullDramaData(bookId, 'in');
         res.json({ status: true, success: true, data: finalData });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// -- NETSHORT LEGACY --
router.get('/netshort/foryou', async (req, res) => {
    try { const r = await nsHome(parseInt(req.query.page)||1); res.json(r); } catch (e) { res.status(500).json({error:e.message}); }
});
router.get('/netshort/search', async (req, res) => {
    try { const r = await nsSearch(req.query.query); res.json(r); } catch (e) { res.status(500).json({error:e.message}); }
});
router.get('/netshort/allepisode', async (req, res) => {
    try { const r = await nsDetail(req.query.shortPlayId); res.json(r); } catch (e) { res.status(500).json({error:e.message}); }
});

// -- ADMIN --
router.get('/admin/config', async (req, res) => {
    try {
        let config = await Settings.findOne();
        if (!config) config = await Settings.create({ siteName: "StreamHub Indo" }); 
        res.json(config);
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});
router.post('/admin/update-all', async (req, res) => {
    const { newName, newDesc, newLogo, password } = req.body;
    try {
        const config = await Settings.findOne();
        if (config.adminPassword && config.adminPassword !== password) return res.status(401).json({ success: false, message: "Wrong Password" });
        config.siteName = newName; if(newDesc) config.siteDescription = newDesc; if(newLogo) config.logoUrl = newLogo;
        await config.save(); res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

export default router;