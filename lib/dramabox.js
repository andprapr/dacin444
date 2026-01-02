import Dramabox from './dramabox-class.js'; 

const api = new Dramabox('in'); 

export const foryou = async (page) => {
    // Ambil data array buku yang sudah diformat
    const books = await api.getRecommendedBooks(page);
    
    // Bungkus sesuai format referensi
    return {
        success: true,
        data: {
            isMore: true, // Hardcode true, asumsi selalu ada next page
            book: books   // Array buku dimasukkan ke sini
        }
    };
};

export const search = async (query) => {
    const books = await api.searchDrama(query);
    
    // Bungkus juga untuk search biar konsisten
    return {
        success: true,
        data: {
            isMore: true,
            book: books
        }
    };
};

export const allepisode = async (id) => {
    const detail = await api.getDramaDetail(id);
    const chapters = await api.getChapters(id);
    
    return {
        success: true,
        data: {
            ...detail,
            chapters: chapters
        }
    };
};