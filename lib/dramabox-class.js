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
      headers: { 'User-Agent': 'okhttp/4.10.0', 'Accept': 'application/json', 'Connection': 'Keep-Alive' }
    });
    this.lang = lang || 'in'; 
  }

  isTokenValid() { return this.tokenCache !== null; }

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
        "Content-Type": "application/json; charset=UTF-8", 'over-flow': 'new-fly'
      };

      const bodyPayload = { distinctId: "" };
      const url = `${this.baseUrl_Dramabox}/drama-box/ap001/bootstrap?timestamp=${timestamp}`;
      headers['sn'] = this.util.sign(`timestamp=${timestamp}${JSON.stringify(bodyPayload)}${deviceId}${androidId}`);

      const res = await this.http.post(url, bodyPayload, { headers });
      if (res.data?.data?.user) {
        this.tokenCache = { token: res.data.data.user.token, deviceId, androidId, spoffer };
      }
    } catch (error) { console.error("[Dramabox] Login Error:", error.message); }
  }

  async getToken() { if (this.isTokenValid()) return this.tokenCache; await this.generateNewToken(); return this.tokenCache; }

  async request(endpoint, body = {}, method = "POST", isWebfic = false) {
    try {
      if (isWebfic) {
          const res = await axios.get(`${this.webficUrl}${endpoint}`, {
            headers: { "pline": "DRAMABOX", "language": this.lang, "User-Agent": "okhttp/4.10.0" }
          });
          return res.data;
      }
      const timestamp = Date.now();
      let tokenData = await this.getToken();
      if (!tokenData) { await this.generateNewToken(); tokenData = await this.getToken(); }

      const url = `${this.baseUrl_Dramabox}${endpoint}?timestamp=${timestamp}`;
      const headers = {
        "tn": `Bearer ${tokenData.token}`, "version": "492", "vn": "4.9.2", "cid": "DAUAF1064291", "package-Name": "com.storymatrix.drama",
        "Apn": "1", "device-id": tokenData.deviceId, "language": this.lang, "current-Language": this.lang, "p": "51",
        "Time-Zone": "+0700", "md": "Redmi Note 8", "ov": "14", "android-id": tokenData.androidId,
        "mf": "XIAOMI", "brand": "Xiaomi", "X-Forwarded-For": tokenData.spoffer, "X-Real-IP": tokenData.spoffer,
        "Content-Type": "application/json; charset=UTF-8", "Host": "sapi.dramaboxdb.com", 'over-flow': 'new-fly'
      };
      headers['sn'] = this.util.sign(`timestamp=${timestamp}${JSON.stringify(body)}${tokenData.deviceId}${tokenData.androidId}${headers['tn']}`);
      const response = await this.http({ method, url, data: body, headers });
      return response.data;
    } catch (error) { return { success: false, msg: error.message }; }
  }

  // === FITUR UTAMA ===

  async getVIPContent() {
    try {
      // Coba beberapa endpoint yang mungkin untuk VIP content
      const endpoints = [
        { path: "/drama-box/home/vip", body: { pageNo: 1, needRecommend: 1 } },
        { path: "/drama-box/vip/home", body: { pageNo: 1 } },
        { path: "/drama-box/vip/page", body: { pageNo: 1, pageSize: 20 } }
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await this.request(endpoint.path, endpoint.body);
          // Cek apakah response memiliki data yang valid
          if (data?.data && (data.data.columnVoList || data.data.bannerList)) {
            console.log(`[Dramabox] VIP Content loaded from: ${endpoint.path}`);
            return data.data;
          }
        } catch (err) {
          console.log(`[Dramabox] Failed endpoint: ${endpoint.path}`);
          continue;
        }
      }

      // Jika semua endpoint gagal, return empty structure
      console.warn("[Dramabox] All VIP endpoints failed, returning empty data");
      return {
        bannerList: [],
        watchHistory: [],
        columnVoList: []
      };
    } catch (error) {
      console.error("[Dramabox] VIP Content Error:", error.message);
      return {
        bannerList: [],
        watchHistory: [],
        columnVoList: []
      };
    }
  }

  async getRecommendedBooks(pageNo = 1) {
    try {
        const data = await this.request("/drama-box/he001/recommendBook", {
            isNeedRank: 1, newChannelStyle: 1, specialColumnId: 0, pageNo: parseInt(pageNo), channelId: 43
        });
        let rawList = data?.data?.recommendList?.records || [];
        if (rawList.length === 0) {
            const backupData = await this.request("/drama-box/he001/classify", {
                pageNo: parseInt(pageNo), pageSize: 20, showLabels: true, typeList: [] 
            });
            rawList = backupData?.data?.classifyBookList?.records || [];
        }
        return this.formatList(rawList);
    } catch (error) { return []; }
  }

  async searchDrama(keyword, pageNo = 1) {
    const data = await this.request("/drama-box/search/search", {
      searchSource: 'search_button', pageNo: parseInt(pageNo), pageSize: 20, from: 'search_sug', keyword
    });
    return this.formatList(data?.data?.searchList || []);
  }

  async getDubbedList(pageNo = 1, pageSize = 15) {
    return await this.request("/drama-box/he001/classify", {
      pageNo, pageSize, showLabels: true,
      typeList: [{ "type": 1, "value": "" }, { "type": 2, "value": "1" }, { "type": 3, "value": "" }, { "type": 4, "value": "" }, { "type": 5, "value": "1" }]
    });
  }

  async getDramaDetailV2(bookId) {
    try {
        const data = await this.request(`/webfic/book/detail/v2?id=${bookId}&language=${this.lang}`, {}, "GET", true);
        const { chapterList, book } = data?.data || {};
        const chapters = (chapterList || []).map(ch => ({ index: ch.index, id: ch.id }));
        return { chapters, drama: book };
    } catch (e) { return { chapters: [], drama: {} }; }
  }

  // === PERBAIKAN LOGIKA EPISODE (MENGGUNAKAN chapterCount DARI BERBAGAI SUMBER) ===
  async getChaptersWithMetadata(bookId) {
      // 1. Ambil Batch 1 dari Server Dramabox (Video Source)
      const batchRequest = await this.request("/drama-box/chapterv2/batch/load", {
          boundaryIndex: 0, comingPlaySectionId: -1, index: 1,
          currencyPlaySource: "discover_new_rec_new", needEndRecommend: 0,
          preLoad: false, rid: "", pullCid: "", loadDirection: 0, bookId: bookId.toString()
      });

      const batchList = batchRequest?.data?.chapterList || [];
      
      // 2. Ambil Webfic (Metadata Source)
      const webfic = await this.getDramaDetailV2(bookId);
      
      // 3. HITUNG TOTAL EPISODE SECARA AKURAT
      // Kadang Batch bilang 6, tapi Webfic bilang 80. Kita ambil yang TERBESAR.
      const countFromBatch = batchRequest?.data?.chapterCount || 0;
      const countFromWebfic = webfic.drama?.chapterCount || 0;
      const countFromList = webfic.chapters?.length || 0;
      
      // Logika Penyelamat: Ambil nilai maksimal
      const totalChapters = Math.max(countFromBatch, countFromWebfic, countFromList, batchList.length);

      let finalChapters = [];

      // SKENARIO A: Webfic Sukses & Lengkap (Ideal)
      if (webfic.chapters && webfic.chapters.length >= totalChapters) {
          finalChapters = webfic.chapters.map(wc => {
              const match = batchList.find(b => b.index === wc.index || b.id == wc.id);
              let videoUrl = null;
              if (match) {
                  const cdn = match.cdnList?.find(c => c.isDefault === 1) || match.cdnList?.[0];
                  const v = cdn?.videoPathList?.find(x => x.isDefault === 1) || cdn?.videoPathList?.[0];
                  videoUrl = v?.videoPath;
              }
              return {
                  id: wc.id,
                  index: wc.index,
                  name: `Episode ${wc.index + 1}`,
                  url: videoUrl,
                  videoPath: videoUrl
              };
          });
      } 
      // SKENARIO B: Webfic Gagal -> Pakai Batch + Ghost Chapters
      else {
          // Masukkan episode nyata (yang ada videonya)
          finalChapters = batchList.map(b => {
              const cdn = b.cdnList?.[0]; 
              const v = cdn?.videoPathList?.[0];
              return { 
                  id: b.id, 
                  index: b.index, 
                  name: b.name || `Episode ${b.index + 1}`, 
                  url: v?.videoPath, 
                  videoPath: v?.videoPath 
              };
          });

          // Generate Ghost Episode jika total > batch
          if (totalChapters > finalChapters.length) {
              const lastIdx = finalChapters[finalChapters.length - 1].index;
              for (let i = lastIdx + 1; i < totalChapters; i++) {
                  finalChapters.push({
                      id: `ghost_${i}`, 
                      index: i,
                      name: `Episode ${i + 1}`,
                      url: null, 
                      videoPath: null
                  });
              }
          }
      }

      // Metadata fallback
      const meta = webfic.drama || {};
      const fallbackMeta = {
          bookName: batchRequest?.data?.bookName,
          coverWap: batchRequest?.data?.coverWap,
          introduction: batchRequest?.data?.introduction
      };

      return { 
          metadata: { ...fallbackMeta, ...meta }, 
          chapters: finalChapters 
      };
  }

  async getChapters(bookId) {
      const data = await this.getChaptersWithMetadata(bookId);
      return data.chapters;
  }

  formatList(rawList) {
    const list = rawList.flatMap(item => {
      if (item.cardType === 3 && item.tagCardVo?.tagBooks) return item.tagCardVo.tagBooks;
      return [item];
    });
    const uniqueList = list.filter((v, i, arr) => arr.findIndex(b => b.bookId === v.bookId) === i);
    return uniqueList.map(book => ({
      id: book.bookId, name: book.bookName, cover: book.coverWap || book.cover,
      chapterCount: book.chapterCount, introduction: book.introduction, 
      playCount: book.playCount, cornerName: book.corner?.name || "Hot", 
      cornerColor: book.corner?.color || "#F54E96"
    }));
  }
}