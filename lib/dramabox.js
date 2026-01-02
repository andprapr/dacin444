import DramaBoxAPI from './dramabox-api.js';

// Inisialisasi API DramaBox yang Asli
const api = new DramaBoxAPI();

// ==========================================
// 5 FITUR UTAMA (MENGGUNAKAN REAL API)
// ==========================================

export const foryou = async (page) => {
    console.log(`[DramaBox Real] Fetching For You Page ${page}`);
    // Memanggil API asli dari dramabox-api.js
    return await api.fetchForYou(page);
};

export const search = async (query) => {
    console.log(`[DramaBox Real] Searching: ${query}`);
    return await api.fetchSearch(query);
};

export const allepisode = async (id) => {
    console.log(`[DramaBox Real] Fetching Details ID: ${id}`);
    return await api.fetchDetail(id);
};

export const trending = async (page) => {
    console.log(`[DramaBox Real] Fetching Trending Page ${page}`);
    return await api.fetchTrending(page);
};

export const dubindo = async (page) => {
    console.log(`[DramaBox Real] Fetching Dub Indo Page ${page}`);
    return await api.fetchDubIndo(page);
};

// ==========================================
// FITUR TAMBAHAN (LOGIKA KUSTOM)
// ==========================================

export const vip = async () => {
    // Kita ambil dari halaman jauh (Page 10) sebagai simulasi konten VIP
    return await api.fetchForYou(10);
};

export const randomdrama = async () => {
    // Ambil halaman acak 1-20
    const randomPage = Math.floor(Math.random() * 20) + 1;
    return await api.fetchForYou(randomPage);
};

export const latest = async () => {
    // Latest = Halaman 1
    return await api.fetchForYou(1);
};

export const populersearch = async () => {
    // Populer = Data Trending
    return await api.fetchTrending(1);
};

export const detail = async (id) => {
    return await api.fetchDetail(id);
};