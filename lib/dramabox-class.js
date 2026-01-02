import axios from 'axios';
import DramaboxUtil from './utils.js';

export default class Dramabox {
  util;
  baseUrl_Dramabox = 'https://sapi.dramaboxdb.com';
  tokenCache = null;
  http;
  lang;

  constructor(lang = 'in') {
    this.util = new DramaboxUtil();
    this.http = axios.create({
      timeout: 20000,
      headers: {
        'User-Agent': 'okhttp/4.10.0',
        'Accept': 'application/json',
        'Connection': 'Keep-Alive'
      }
    });
    this.lang = lang; 
  }

  isTokenValid() {
    return this.tokenCache !== null;
  }

  async generateNewToken(timestamp = Date.now()) {
    try {
      const spoffer = this.util.generateRandomIP();
      const deviceId = this.util.generateUUID();
      const androidId = this.util.randomAndroidId();
      
      const headers = {
        "tn": "", "version": "492", "vn": "4.9.2", "cid": "DAUAF1064291", "package-Name": "com.storymatrix.drama",
        "Apn": "1", "device-id": deviceId, "language": this.lang, "current-Language": this.lang, "p": "51",       
        "Time-Zone": "+0700", "md": "Redmi Note 8", "ov": "14", "android-id": androidId,
        "X-Forwarded-For": spoffer, "X-Real-IP": spoffer, "mf": "XIAOMI", "brand": "Xiaomi",
        "Content-Type": "application/json; charset=UTF-8",
      };

      const bodyPayload = { distinctId: "" };
      const strBody = JSON.stringify(bodyPayload);
      const signature = this.util.sign(`timestamp=${timestamp}${strBody}${deviceId}${androidId}`);
      headers['sn'] = signature;
      
      const url = `${this.baseUrl_Dramabox}/drama-box/ap001/bootstrap?timestamp=${timestamp}`;
      const res = await this.http.post(url, bodyPayload, { headers });

      if (res.data?.data?.user) {
        this.tokenCache = {
          token: res.data.data.user.token,
          deviceId, androidId, spoffer
        };
        console.log("[Dramabox] Login OK");
      }
    } catch (error) { console.error("[Dramabox] Login Error:", error.message); }
  }

  async getToken() {
    if (this.isTokenValid()) return this.tokenCache;
    await this.generateNewToken();
    return this.tokenCache;
  }

  async request(endpoint, body = {}, method = "POST") {
    try {
      const timestamp = Date.now();
      let tokenData = await this.getToken();
      if (!tokenData) { await this.generateNewToken(); tokenData = await this.getToken(); }
      if (!tokenData) return { success: false, msg: "Auth Failed" };

      const url = `${this.baseUrl_Dramabox}${endpoint}?timestamp=${timestamp}`;
      const headers = {
        "tn": `Bearer ${tokenData.token}`,
        "version": "492", "vn": "4.9.2", "cid": "DAUAF1064291", "package-Name": "com.storymatrix.drama",
        "Apn": "1", "device-id": tokenData.deviceId, "language": this.lang, "current-Language": this.lang, "p": "51",
        "Time-Zone": "+0700", "md": "Redmi Note 8", "ov": "14", "android-id": tokenData.androidId,
        "mf": "XIAOMI", "brand": "Xiaomi", "X-Forwarded-For": tokenData.spoffer, "X-Real-IP": tokenData.spoffer,
        "Content-Type": "application/json; charset=UTF-8",
        "Host": "sapi.dramaboxdb.com"
      };

      const strBody = JSON.stringify(body);
      headers['sn'] = this.util.sign(`timestamp=${timestamp}${strBody}${tokenData.deviceId}${tokenData.androidId}${headers['tn']}`);

      const response = await this.http({ method, url, data: body, headers });
      return response.data;
    } catch (error) { return { success: false, msg: error.message }; }
  }

  // === FITUR UTAMA ===

  async getRecommendedBooks(pageNo = 1, pageSize = 10) {
    const payload = { typeList: [], showLabels: false, pageNo: parseInt(pageNo), pageSize: parseInt(pageSize) };
    const data = await this.request("/drama-box/he001/classify", payload);
    const rawList = data?.data?.classifyBookList?.records || [];
    
    // Fallback jika kosong
    if (rawList.length === 0) {
        const rec = await this.request("/drama-box/search/index");
        return { isMore: true, book: this.formatList(rec?.data?.hotVideoList || []) };
    }
    return { isMore: data?.data?.classifyBookList?.isMore == 1, book: this.formatList(rawList) };
  }

  async searchDrama(keyword, pageNo = 1) {
    const data = await this.request("/drama-box/search/search", {
      searchSource: 'search_button', pageNo: parseInt(pageNo), pageSize: 20, from: 'search_sug', keyword
    });
    return { isMore: data?.data?.isMore == 1, book: this.formatList(data?.data?.searchList || []) };
  }

  async getDubbedList(pageNo = 1, pageSize = 15) {
    const payload = {
      pageNo: parseInt(pageNo), pageSize: parseInt(pageSize), showLabels: true,
      typeList: [{ "type": 1, "value": "" }, { "type": 2, "value": "1" }, { "type": 3, "value": "" }, { "type": 4, "value": "" }, { "type": 5, "value": "1" }]
    };
    return await this.request("/drama-box/he001/classify", payload);
  }

  // --- REVISI: DETAIL & CHAPTER ---
  // Kita pisahkan logic pengambilan data mentah
  async getRawDetail(bookId) {
    return await this.request("/drama-box/drama/detail", { bookId: bookId.toString() });
  }

  async getRawChapters(bookId) {
    return await this.request("/drama-box/chapter/list", { bookId: bookId.toString(), pageSize: 720, pageNo: 0 });
  }

  async getStreamUrl(bookId, episode) {
    try {
        const response = await axios.get('https://dramabox-asia.vercel.app/api/stream', {
            params: { bookId, episode, lang: this.lang }, timeout: 10000 
        });
        return response.data;
    } catch (error) { return { status: 'error', message: 'Stream not found' }; }
  }

  // Helper
  formatList(rawList) {
    const list = rawList.flatMap(item => {
      if (item.cardType === 3 && item.tagCardVo?.tagBooks) return item.tagCardVo.tagBooks;
      return [item];
    });
    const uniqueList = list.filter((v, i, arr) => arr.findIndex(b => b.bookId === v.bookId) === i);
    return uniqueList.map(book => ({
      id: book.bookId, name: book.bookName, cover: book.coverWap || book.cover,
      chapterCount: book.chapterCount, introduction: book.introduction, tags: book.tagV3s || book.tagNames,
      playCount: book.playCount, cornerName: book.corner?.name || "Hot", cornerColor: book.corner?.color || "#F54E96"
    }));
  }
}