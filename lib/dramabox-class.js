import axios from 'axios';
import DramaboxUtil from './utils.js';

export default class Dramabox {
  util;
  baseUrl_Dramabox = 'https://sapi.dramaboxdb.com';
  tokenCache = null;
  http;
  lang;
  debugMsg = "";

  constructor(lang = 'in') {
    this.util = new DramaboxUtil();
    this.http = axios.create({
      timeout: 15000,
      headers: { 'User-Agent': 'okhttp/4.9.2', 'Accept': 'application/json' }
    });
    this.lang = lang; 
  }

  // --- TOKEN ---
  async generateNewToken(timestamp = Date.now()) {
    try {
      const deviceId = this.util.generateUUID();
      const androidId = this.util.randomAndroidId();
      const headers = {
        "tn": "", "version": "492", "vn": "4.9.2", "cid": "DAUAF1064291", "package-Name": "com.storymatrix.drama",
        "Apn": "1", "device-id": deviceId, "language": this.lang, "current-Language": this.lang, "p": "51",       
        "Time-Zone": "+0700", "md": "Redmi Note 8", "ov": "9", "raw-device-id": "", "androidId": androidId,
        "Content-Type": "application/json;charset=UTF-8", "timestamp": timestamp.toString()
      };
      const sn = this.util.sign(`timestamp=${timestamp}${deviceId}${androidId}${headers['tn']}`);
      
      // Jika SN null, berarti Utils.js rusak
      if(!sn) throw new Error("Signature Generation Failed (Check Utils.js)");

      this.tokenCache = { ...headers, 'sn': sn };
      return this.tokenCache;
    } catch (error) { 
      this.debugMsg = error.message; 
      return null; 
    }
  }

  async getHeaders() {
    if (!this.tokenCache) await this.generateNewToken();
    return { ...this.tokenCache };
  }

  async request(endpoint, body = {}) {
    const url = `${this.baseUrl_Dramabox}${endpoint}`;
    let headers = await this.getHeaders();
    
    // Cek jika header gagal dibuat
    if (!headers || !headers['sn']) {
        return { success: false, message: `Header Error: ${this.debugMsg}` };
    }

    if(Object.keys(body).length > 0) {
       const timestamp = Date.now();
       const sn = this.util.sign(`timestamp=${timestamp}${JSON.stringify(body)}${headers['device-id']}${headers['androidId']}${headers['tn']}`);
       headers['sn'] = sn; headers['timestamp'] = timestamp.toString();
    }

    try {
      const response = await this.http.post(url, body, { headers });
      
      // DETEKSI ERROR DARI SERVER DRAMABOX
      // Jika ada field 'code' dan bukan 200, berarti error (misal: 500 Signature verify failed)
      if (response.data && response.data.code && response.data.code != 200) {
          console.error(`API Refused [${endpoint}]:`, response.data);
          return { success: false, message: `API Error ${response.data.code}: ${response.data.msg || 'Unknown'}` };
      }

      return response.data;
    } catch (error) {
      this.tokenCache = null;
      return { success: false, message: error.message };
    }
  }

  // --- GET DATA ---
  async getRecommendedBooks(pageNo = 1, pageSize = 20) {
    const pNo = parseInt(pageNo);
    const pSize = parseInt(pageSize);

    // 1. Request
    let data = await this.request("/drama-box/he001/classify", { pageNo: pNo, pageSize: pSize, type: 1 });

    // 2. CEK ERROR DARI REQUEST
    if (data.success === false) {
        return this.returnErrorBook(data.message);
    }

    // 3. Ekstrak Data
    let rawList = this.extractBooks(data);

    // 4. Fallback 1: Trending
    if (rawList.length === 0) {
        let hotData = await this.request("/drama-box/search/index", {});
        if (hotData.success === false) return this.returnErrorBook("Fallback Error: " + hotData.message);
        rawList = hotData?.data?.hotVideoList || [];
    }

    // 5. Fallback 2: Search
    if (rawList.length === 0) {
        let searchData = await this.request("/drama-box/search/search", {
            searchSource: 'search_button', pageNo: 1, pageSize: 20, from: 'search_sug', keyword: 'Love'
        });
        if (searchData.success === false) return this.returnErrorBook("Search Error: " + searchData.message);
        rawList = searchData?.data?.searchList || [];
    }

    // 6. Masih Kosong?
    if (rawList.length === 0) {
        return this.returnErrorBook("Data Kosong (Empty Response from 3 Endpoints)");
    }

    // 7. Mapping Data
    return rawList
      .filter((v, i, arr) => arr.findIndex(b => b.bookId === v.bookId) === i)
      .map(item => ({
         id: item.bookId || "",
         name: item.bookName || item.name || "Tanpa Judul",
         cover: item.cover || item.coverWap || "",
         chapterCount: item.chapterCount || 0,
         introduction: item.briefIntroduction || item.introduction || "",
         tags: (item.labelList || []).map(tag => ({ tagId: tag.id, tagName: tag.name, tagEnName: tag.enName || "" })),
         playCount: item.heatScoreShow || "HOT",
         cornerName: item.cornerMark || "Hot",
         cornerColor: "#F54E96"
      }));
  }

  // Helper: Tampilkan Error sebagai Buku
  returnErrorBook(msg) {
      return [{
        id: "error",
        name: `ERROR: ${msg}`,
        cover: "https://placehold.co/300x400/red/white?text=ERROR",
        chapterCount: 0,
        introduction: "Cek console server atau utils.js",
        tags: [],
        playCount: "0",
        cornerName: "ERR",
        cornerColor: "#FF0000"
      }];
  }

  extractBooks(data) {
    const raw = data?.data?.book || data?.data?.cards || [];
    return raw.flatMap(item => {
      if (item.cardType === 3 && item.tagCardVo?.tagBooks) return item.tagCardVo.tagBooks;
      if (item.bookId) return [item];
      return [];
    });
  }

  // ... (Fungsi Search, Detail, Chapter biarkan sama seperti sebelumnya)
  async searchDrama(keyword, pageNo = 1, pageSize = 20) {
    const data = await this.request("/drama-box/search/search", { searchSource: 'search_button', pageNo: parseInt(pageNo), pageSize: parseInt(pageSize), from: 'search_sug', keyword: keyword });
    return (data?.data?.searchList || []).map(item => ({ id: item.bookId, name: item.bookName || item.name, cover: item.cover || item.coverWap, chapterCount: item.chapterCount || 0, introduction: item.briefIntroduction || "", tags: [], playCount: item.heatScoreShow || "0", cornerName: "Search", cornerColor: "#000000" }));
  }
  async getDramaDetail(bookId) {
    const data = await this.request("/drama-box/drama/detail", { bookId: bookId.toString() });
    return data?.data || null;
  }
  async getChapters(bookId, pageSize = 720, pageNo = 0) {
    const data = await this.request("/drama-box/chapter/list", { bookId: bookId.toString(), pageSize: parseInt(pageSize), pageNo: parseInt(pageNo) });
    return data?.data?.chapterList || [];
  }
}