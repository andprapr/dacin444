import { Router } from 'express';
import axios from 'axios'; 
import { Settings } from '../lib/db.js'; 
import Dramabox from '../lib/dramabox-class.js'; 
import { allepisode as nsDetail, search as nsSearch, foryou as nsHome } from '../lib/netshort.js';

const router = Router();

const createProxyUrl = (rawUrl) => {
    if (!rawUrl) return null;
    return `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
};

const formatNetshortItem = (item) => ({
    id: item.shortPlayId, bookId: item.shortPlayId, source: 'netshort',
    name: item.shortPlayName, title: item.shortPlayName,
    cover: item.shortPlayCover || "https://placehold.co/300x450?text=No+Cover",
    poster: item.shortPlayCover, chapterCount: item.chapterCount || 0,
    introduction: item.introduction || "Sinopsis tidak tersedia.",
    playCount: item.heatScoreShow || "", tags: item.labelArray || [], status: 1
});

// PROXY VIDEO
router.get('/proxy', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send("URL video tidak ditemukan");
    try {
        const headers = { 'User-Agent': 'okhttp/4.10.0', 'Referer': 'https://www.dramabox.com/' };
        if (req.headers.range) headers['Range'] = req.headers.range;
        const response = await axios({
            method: 'GET', url: videoUrl, responseType: 'stream', headers: headers,
            validateStatus: status => status >= 200 && status < 300
        });
        res.status(response.status);
        ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
            if (response.headers[h]) res.set(h.replace(/\b\w/g, l => l.toUpperCase()), response.headers[h]);
        });
        response.data.pipe(res);
    } catch (error) { if (!res.headersSent) res.status(500).send("Proxy Error"); }
});

// VIP CONTENT
router.get('/vip', async (req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=600');
        const lang = req.query.lang || 'in';
        const dramabox = new Dramabox(lang);
        const result = await dramabox.getVIPContent();
        res.json({ success: true, data: result });
    } catch (e) { 
        res.status(500).json({ success: false, message: e.message }); 
    }
});

// REKOMENDASI (FIXED)
router.get('/recommend', async (req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=600');
        const dramabox = new Dramabox('in');
        const result = await dramabox.getRecommendedBooks(1);
        res.json({ success: true, data: result });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// HOME & SEARCH
router.get('/home', async (req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=300'); 
        const source = req.query.source || req.query.server || 'dramabox';
        if (source === 'netshort') {
            const rawData = await nsHome(parseInt(req.query.page) || 1);
            const list = rawData.contentInfos || [];
            return res.json({ status: true, success: true, data: list.map(formatNetshortItem), isMore: list.length > 0 });
        }
        const dramabox = new Dramabox('in');
        const result = await dramabox.getRecommendedBooks(req.query.page || 1);
        const labeledData = result.map(item => ({ ...item, source: 'dramabox' }));
        return res.json({ status: true, success: true, data: labeledData, isMore: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/search', async (req, res) => {
    try {
        const source = req.query.source || req.query.server || 'dramabox';
        const query = req.query.q || req.query.query || "";
        if (source === 'netshort') {
            const rawData = await nsSearch(query);
            const list = Array.isArray(rawData) ? rawData : (rawData.contentInfos || []);
            return res.json({ status: true, success: true, data: list.map(formatNetshortItem) });
        }
        const dramabox = new Dramabox('in');
        const result = await dramabox.searchDrama(query);
        const labeledData = result.map(item => ({ ...item, source: 'dramabox' }));
        return res.json({ status: true, success: true, data: labeledData });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DETAIL V2 (FIX JUMLAH EPISODE)
router.get(['/detail/:bookId', '/detail/:bookId/v2'], async (req, res) => {
    try {
        res.set('Cache-Control', 'public, max-age=3600');
        const source = req.query.source || req.query.server || 'dramabox';
        if (source === 'netshort') {
            const nsData = await nsDetail(req.params.bookId);
            return res.json({
                ...nsData,
                id: req.params.bookId, source: 'netshort',
                name: nsData.shortPlayName || nsData.name, cover: nsData.shortPlayCover || nsData.cover,
                chapters: (nsData.chapters || []).map(ch => ({ ...ch, url: ch.url || null }))
            });
        }
        
        // DRAMABOX LOGIC
        const dramabox = new Dramabox('in');
        
        // Panggil fungsi gabungan (Webfic + Batch 1)
        const fullData = await dramabox.getChaptersWithMetadata(req.params.bookId);
        
        const d = fullData.metadata || {};
        const chs = fullData.chapters || [];

        const finalName = d.bookName || "Judul Tidak Ditemukan";
        const finalCover = d.cover || d.coverWap || "https://placehold.co/300x450?text=No+Cover";
        const finalIntro = d.introduction || d.briefIntroduction || "Sinopsis tidak tersedia.";
        
        // Format chapter agar seragam
        const formattedChapters = chs.map(ch => ({
            id: ch.id,
            index: ch.index,
            name: ch.name || `Episode ${ch.index + 1}`,
            url: ch.url ? createProxyUrl(ch.url) : null,
            videoPath: ch.url // Simpan raw url juga
        }));

        // Struktur respon standar
        return res.json({ 
            status: true, 
            success: true, 
            data: {
                id: req.params.bookId,
                bookId: req.params.bookId,
                source: 'dramabox',
                name: finalName,
                cover: finalCover,
                introduction: finalIntro,
                chapters: formattedChapters, // List lengkap 1-tamat
                episode_count: formattedChapters.length
            }
        });

    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/stream', async (req, res) => {
    try {
        res.set('Cache-Control', 'no-cache'); 
        const { bookId, episode } = req.query;
        if (!bookId) return res.status(400).json({ status: false, message: "Book ID required" });
        
        const dramabox = new Dramabox('in');
        const index = parseInt(episode) || 0;
        const result = await dramabox.request("/drama-box/chapterv2/batch/load", {
            boundaryIndex: 0, comingPlaySectionId: -1, index: index,
            currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
            preLoad: false, loadDirection: 0, bookId: bookId.toString()
        });

        const list = result?.data?.chapterList || [];
        const targetChapter = list.find(ch => (ch.index === index) || (ch.id == episode)) || list[0];

        if (!targetChapter) return res.status(404).json({ status: false, message: "Video belum tersedia" });

        const cdn = targetChapter.cdnList?.find(c => c.isDefault === 1) || targetChapter.cdnList?.[0];
        let videoInfo = cdn?.videoPathList?.find(v => v.isDefault === 1);
        if (!videoInfo && cdn?.videoPathList) videoInfo = cdn.videoPathList.find(v => v.quality === 720) || cdn.videoPathList[0];

        if (!videoInfo?.videoPath) return res.status(404).json({ status: false, message: "Link rusak/VIP" });

        res.json({ status: true, success: true, url: createProxyUrl(videoInfo.videoPath), quality: videoInfo.quality });
    } catch (e) { res.status(500).json({ status: false, message: e.message }); }
});

// LEGACY
router.get('/dramabox/allepisode', async (req, res) => { try { res.set('Cache-Control', 'public, max-age=3600'); const finalData = await getFullDramaData(req, req.query.shortPlayId, 'in'); res.json({ status: true, success: true, data: finalData }); } catch (e) { res.status(500).json({ status: false, message: e.message }); } });
router.get('/dramabox/foryou', async (req, res) => { try { const r = await new Dramabox('in').getRecommendedBooks(parseInt(req.query.page)||1); res.json({status:true,success:true,data:r}); } catch (e) { res.status(500).json({error:e.message}); } });
router.get('/dramabox/search', async (req, res) => { try { const r = await new Dramabox('in').searchDrama(req.query.query); res.json({status:true,success:true,data:r}); } catch (e) { res.status(500).json({error:e.message}); } });
router.get('/netshort/foryou', async (req, res) => { try { const r = await nsHome(parseInt(req.query.page)||1); res.json(r); } catch (e) { res.status(500).json({error:e.message}); } });
router.get('/netshort/search', async (req, res) => { try { const r = await nsSearch(req.query.query); res.json(r); } catch (e) { res.status(500).json({error:e.message}); } });
router.get('/netshort/allepisode', async (req, res) => { try { const r = await nsDetail(req.query.shortPlayId); res.json(r); } catch (e) { res.status(500).json({error:e.message}); } });
router.get('/admin/config', async (req, res) => { try { let c = await Settings.findOne(); if (!c) c = await Settings.create({ siteName: "StreamHub Indo" }); res.json(c); } catch (e) { res.status(500).json({ error: "DB" }); } });
router.post('/admin/update-all', async (req, res) => { const { newName, newDesc, newLogo, password } = req.body; try { const c = await Settings.findOne(); if (c.adminPassword && c.adminPassword !== password) return res.status(401).json({ success: false }); c.siteName = newName; if(newDesc) c.siteDescription = newDesc; if(newLogo) c.logoUrl = newLogo; await c.save(); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } });

export default router;