import axios from 'axios';
import DramaboxUtil from './utils.js';

export default class Dramabox {
  util;
  baseUrl_Dramabox = 'https://sapi.dramaboxdb.com';
  webficUrl = 'https://www.webfic.com';
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
        'over-flow': 'new-fly'
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
        console.log("[Dramabox] Token Refreshed ✅");
      }
    } catch (error) { console.error("[Dramabox] Login Error:", error.message); }
  }

  async getToken() {
    if (this.isTokenValid()) return this.tokenCache;
    await this.generateNewToken();
    return this.tokenCache;
  }

  async request(endpoint, body = {}, method = "POST", isWebfic = false) {
    try {
      // Handle Webfic GET Request (Metadata)
      if (isWebfic) {
          const url = `${this.webficUrl}${endpoint}`;
          const headers = {
            "Content-Type": "application/json",
            "pline": "DRAMABOX",
            "language": this.lang,
            "User-Agent": "okhttp/4.10.0"
          };
          const res = await axios.get(url, { headers });
          return res.data;
      }

      // Handle Dramabox POST Request
      const timestamp = Date.now();
      let tokenData = await this.getToken();
      if (!tokenData) { await this.generateNewToken(); tokenData = await this.getToken(); }

      const url = `${this.baseUrl_Dramabox}${endpoint}?timestamp=${timestamp}`;
      const headers = {
        "tn": `Bearer ${tokenData.token}`,
        "version": "492", "vn": "4.9.2", "cid": "DAUAF1064291", "package-Name": "com.storymatrix.drama",
        "Apn": "1", "device-id": tokenData.deviceId, "language": this.lang, "current-Language": this.lang, "p": "51",
        "Time-Zone": "+0700", "md": "Redmi Note 8", "ov": "14", "android-id": tokenData.androidId,
        "mf": "XIAOMI", "brand": "Xiaomi", "X-Forwarded-For": tokenData.spoffer, "X-Real-IP": tokenData.spoffer,
        "Content-Type": "application/json; charset=UTF-8",
        "Host": "sapi.dramaboxdb.com",
        'over-flow': 'new-fly'
      };

      const strBody = JSON.stringify(body);
      headers['sn'] = this.util.sign(`timestamp=${timestamp}${strBody}${tokenData.deviceId}${tokenData.androidId}${headers['tn']}`);

      const response = await this.http({ method, url, data: body, headers });
      return response.data;
    } catch (error) { return { success: false, msg: error.message }; }
  }

  // === FITUR UTAMA ===

  // 1. REKOMENDASI DENGAN FALLBACK (SOLUSI MASALAH ANDA)
  async getRecommendedBooks() {
    try {
        // Coba request utama
        const data = await this.request("/drama-box/he001/recommendBook", {
            isNeedRank: 1, newChannelStyle: 1, specialColumnId: 0, pageNo: 1, channelId: 43
        });

        let rawList = data?.data?.recommendList?.records || [];

        // FALLBACK: Jika kosong, ambil dari Search Index (Hot Video) -> PASTI ADA DATA
        if (rawList.length === 0) {
            console.log("[Dramabox] Rekomendasi utama kosong, mengambil data Hot Video...");
            const hotData = await this.request("/drama-box/search/index");
            rawList = hotData?.data?.hotVideoList || [];
        }

        // Format data agar seragam
        const list = rawList.flatMap(item => {
            if (item.cardType === 3 && item.tagCardVo?.tagBooks) {
                return item.tagCardVo.tagBooks;
            }
            return [item];
        });

        const uniqueList = list.filter(
            (v, i, arr) => arr.findIndex(b => b.bookId === v.bookId) === i
        );

        return uniqueList;

    } catch (error) {
        console.error("Get Recommended Error:", error);
        return [];
    }
  }

  // 2. DETAIL V2 (FIX UNTUK POPUP)
  async getDramaDetailV2(bookId) {
    try {
        const data = await this.request(`/webfic/book/detail/v2?id=${bookId}&language=${this.lang}`, {}, "GET", true);
        const { chapterList, book } = data?.data || {};
        
        const chapters = [];
        if (chapterList && Array.isArray(chapterList)) {
            chapterList.forEach((ch) => {
                chapters.push({ index: ch.index, id: ch.id });
            });
        }

        return { chapters, drama: book };
    } catch (e) {
        console.error("Detail V2 Error:", e);
        return { chapters: [], drama: {} };
    }
  }

  // 3. CHAPTERS (VIDEO)
  async getChapters(bookId) {
    const data = await this.request("/drama-box/chapterv2/batch/load", {
      boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
      currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
      preLoad: false, rid: "", pullCid: "", loadDirection: 0, bookId
    });

    return data?.data?.chapterList || [];
  }

  // 4. STREAM URL
  async getStreamUrl(bookId, episode) {
    // Gunakan Vercel mirror sebagai backup jika direct fail, atau implementasi direct batch load per episode
    try {
        const response = await axios.get('https://dramabox-asia.vercel.app/api/stream', {
            params: { bookId, episode, lang: this.lang }, timeout: 10000 
        });
        return response.data;
    } catch (error) { return { status: 'error', message: 'Stream unavailable' }; }
  }

  // --- Helpers Lain ---
  async searchDrama(keyword, pageNo = 1) {
    const data = await this.request("/drama-box/search/search", {
      searchSource: 'search_button', pageNo: parseInt(pageNo), pageSize: 20, from: 'search_sug', keyword
    });
    return data?.data?.searchList || [];
  }

  async getDramaList(pageNo = 1, pageSize = 10) {
    const data = await this.request("/drama-box/he001/classify", {
      typeList: [], showLabels: false, pageNo, pageSize
    });
    return data?.data?.classifyBookList?.records || [];
  }

  async getDubbedList(pageNo = 1, pageSize = 15) {
    return await this.request("/drama-box/he001/classify", {
      pageNo, pageSize, showLabels: true,
      typeList: [{ "type": 1, "value": "" }, { "type": 2, "value": "1" }, { "type": 3, "value": "" }, { "type": 4, "value": "" }, { "type": 5, "value": "1" }]
    });
  }
}