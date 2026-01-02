import Dramabox from './dramabox-class.js'; 

const api = new Dramabox('in'); 

// Home (Foryou)
export const foryou = async (page) => {
    return {
        success: true,
        data: await api.getRecommendedBooks(page)
    };
};

// Search
export const search = async (query) => {
    return {
        success: true,
        data: await api.searchDrama(query)
    };
};

// Detail + Chapters
export const allepisode = async (id) => {
    const detail = await api.getDramaDetail(id);
    const chapters = await api.getChapters(id);
    return {
        success: true,
        data: { ...detail, chapters: chapters }
    };
};

// --- DUBBED (RAW JSON) ---
export const dubbed = async (page) => {
    const rawResponse = await api.getDubbedListRaw(page);
    
    // Result jadi: { success: true, data: { code: 200, msg: "OK", data: { classifyBookList: ... } } }
    return {
        success: true,
        data: rawResponse
    };
};

// VIP / Theater
export const vip = async () => {
    return {
        success: true,
        data: await api.getVip()
    };
};

// Stream URL
export const stream = async (bookId, episode) => {
    return await api.getStreamUrl(bookId, episode);
};