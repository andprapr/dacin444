// Import fungsi NetShort untuk dipinjam datanya
import { foryou as nsForyou, search as nsSearch, allepisode as nsAllEpisode, theaters as nsTheaters } from './netshort.js';

// --- 5 FITUR UTAMA (SUDAH ADA SEBELUMNYA) ---
export const foryou = async (page) => { return await nsForyou(page + 5); };
export const search = async (query) => { return await nsSearch(query); };
export const allepisode = async (id) => { return await nsAllEpisode(id); };
export const trending = async (page) => { return await nsTheaters(); };
export const dubindo = async (page) => { return await nsSearch("Indo"); };

// --- 5 FITUR TAMBAHAN (SESUAI DOKUMENTASI) ---

// 1. /dramabox/vip (Halaman VIP)
// Kita ambil rekomendasi halaman jauh (hal 10) sebagai konten "VIP"
export const vip = async () => {
    console.log("[DramaBox] Fetching VIP Content");
    return await nsForyou(10);
};

// 2. /dramabox/randomdrama (Random)
// Kita ambil halaman acak antara 1-20
export const randomdrama = async () => {
    const randomPage = Math.floor(Math.random() * 20) + 1;
    console.log(`[DramaBox] Fetching Random Page ${randomPage}`);
    return await nsForyou(randomPage);
};

// 3. /dramabox/latest (Terbaru)
// Kita ambil halaman 1 Netshort
export const latest = async () => {
    console.log("[DramaBox] Fetching Latest");
    return await nsForyou(1);
};

// 4. /dramabox/populersearch (Pencarian Populer)
// Kita ambil data Theater sebagai list yang sedang populer
export const populersearch = async () => {
    console.log("[DramaBox] Fetching Popular Search");
    return await nsTheaters();
};

// 5. /dramabox/detail (Detail Drama)
// Di NetShort, detail gabung dengan episode, jadi kita pakai fungsi yang sama
export const detail = async (id) => {
    console.log(`[DramaBox] Fetching Detail ID: ${id}`);
    return await nsAllEpisode(id);
};