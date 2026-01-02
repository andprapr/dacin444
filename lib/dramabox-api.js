import axios from 'axios';
import DramaboxUtil from './utils.js'; // Mengarah ke file utils.js yang baru dibuat

export default class DramaBoxAPI {
  util;
  baseUrl_Dramabox = 'https://sapi.dramaboxdb.com';
  lang;
  http;

  constructor(lang = 'in') {
    this.util = new DramaboxUtil();
    this.http = axios.create({ timeout: 15000 });
    this.lang = lang; 
  }

  async generateHeaders(body = '') {
    const timestamp = Date.now();
    const deviceId = this.util.generateUUID();
    const androidId = this.util.randomAndroidId();
    
    const baseHeaders = {
      "tn": "",
      "version": "492", 
      "vn": "4.9.2",
      "cid": "DAUAF1064291",
      "package-Name": "com.storymatrix.drama",
      "os": "Android",
      "language": this.lang,
      "current-Language": this.lang,
      "Content-Type": "application/json;charset=UTF-8",
      "timestamp": timestamp.toString()
    };

    const sn = this.util.sign(
      `timestamp=${timestamp}${body}${deviceId}${androidId}${baseHeaders['tn']}`
    );
    
    return {
      ...baseHeaders,
      'sn': sn,
      'device-id': deviceId,
      'androidId': androidId
    };
  }

  async request(endpoint, body = {}) {
    const url = `${this.baseUrl_Dramabox}${endpoint}`;
    const strBody = JSON.stringify(body);
    const headers = await this.generateHeaders(strBody);
    
    try {
      const response = await this.http.post(url, body, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error requesting ${endpoint}:`, error.message);
      return null;
    }
  }

  // --- API METHODS ---

  async getDramaList(page = 1, pageSize = 20) {
    const body = {
      pageNo: parseInt(page),
      pageSize: parseInt(pageSize),
      type: 1 // 1 = Trending/Foryou
    };
    // Menggunakan endpoint classify seperti di source code asli
    const data = await this.request("/drama-box/he001/classify", body);
    return data;
  }

  async searchDrama(keyword, page = 1) {
    const body = {
      searchSource: '搜索按钮',
      pageNo: parseInt(page),
      pageSize: 20,
      from: 'search_sug',
      keyword: keyword
    };
    const data = await this.request("/drama-box/search/search", body);
    return data;
  }

  async getDramaDetail(bookId) {
    // Menggunakan endpoint detail v2 agar lengkap
    const body = { bookId: bookId };
    const data = await this.request("/drama-box/drama/detail/v2", body);
    return data;
  }
}