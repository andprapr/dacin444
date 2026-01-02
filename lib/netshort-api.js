import axios from 'axios';
import { BASE_URL, APP_VER } from './config.js';
import { 
    randomHex, 
    buildUserAgent, 
    encryptRequestPayload, 
    decryptResponsePayload 
} from './crypto-helper.js';

class NetshortAPI {
    constructor() {
        this.client = axios.create({ timeout: 30000 });
        this.deviceCode = randomHex(8);
        this.userAgent = buildUserAgent();
        this.token = null;
        this.userId = null;
    }

    /**
     * Helper internal untuk melakukan request terenkripsi
     */
    async _secureRequest(endpoint, payloadData) {
        const url = `${BASE_URL}${endpoint}`;
        
        // Konversi payload ke JSON string jika belum
        const payloadStr = typeof payloadData === "string" 
            ? payloadData 
            : JSON.stringify(payloadData);

        const { bodyB64, headerKeyB64 } = encryptRequestPayload(payloadStr);
        const ts = Date.now().toString();

        const headers = {
            "Host": "appsecapi.netshort.com",
            "Canary": "v2",
            "Os": "1",
            "Version": APP_VER,
            "Encrypt-Key": headerKeyB64,
            "Device-Code": this.deviceCode,
            "Content-Type": "application/json",
            "Content-Language": "id_ID",
            "User-Agent": this.userAgent,
            "Timestamp": ts,
            "Accept-Encoding": "gzip",
            "Connection": "Keep-Alive",
        };

        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        // Khusus Login butuh header tambahan
        if (endpoint.includes('auth/login')) {
            headers["Start_type"] = "cold";
            headers["Network"] = "wifi,cold,true";
            headers["Push_switch"] = "true";
        }

        try {
            const resp = await this.client.post(url, bodyB64, { headers });
            
            const serverKey = resp.headers["encrypt-key"];
            if (!serverKey) throw new Error(`Encrypt-Key header missing from ${endpoint}`);

            const body = typeof resp.data === "string" ? resp.data.trim() : String(resp.data).trim();
            const result = decryptResponsePayload(serverKey, body);

            return result;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err.message);
            // Kembalikan null atau object error agar tidak crash
            return { error: err.message };
        }
    }

    async login() {
        const payload = {
            os: "Android",
            appVer: APP_VER,
            identity: 0,
            model: "sdk_gphone64_x86_64",
            deviceCode: this.deviceCode,
            source: "visitor",
            osVer: "12",
        };

        const result = await this._secureRequest('/prod-app-api/auth/login', payload);
        
        if (result && result.data && result.data.token) {
            this.token = result.data.token;
            this.userId = result.data.loginUser.userId;
            return { success: true, user: result.data };
        }
        return { success: false, error: result };
    }

    async fetchTheaters(tabId = null, offset = 0, limit = 20) {
        // Gunakan string JSON manual untuk menghindari masalah integer overflow pada tabId
        const tabIdStr = tabId ? String(tabId) : "null";
        const payloadStr = `{"tabId":${tabIdStr},"offset":${offset},"limit":${limit}}`;
        
        return await this._secureRequest('/prod-app-api/video/shortPlay/tab/load_group_tabId', payloadStr);
    }

    async fetchDetail(bookId) {
        const payload = {
            codec: "",
            playClarity: "1080p",
            shortPlayId: bookId // ID Drama/Buku
        };
        return await this._secureRequest('/prod-app-api/video/shortPlay/base/detail_info', payload);
    }

    async fetchSearch(query, pageNo = 1, pageSize = 10) {
        const payload = {
            id: 0,
            shortPlayId: 0,
            searchCode: query,
            pageNo: pageNo,
            pageSize: pageSize,
            searchFlag: 1
        };
        return await this._secureRequest('/prod-app-api/video/shortPlay/search/searchByKeyword', payload);
    }

    async fetchRecommend(bookId) {
        // Rekomendasi berdasarkan ID buku yang sedang dilihat
        const payload = {
            shortPlayId: bookId
        };
        return await this._secureRequest('/prod-app-api/video/shortPlay/recommend/loadBackRecommend', payload);
    }

    async fetchRecommendAll(pageNo = 1, limit = 20) {
        if(pageNo < 1) pageNo = 1;
        const offset = (pageNo - 1) * limit + 1;
        
        const payload = {
            tabId: null,
            offset: offset,
            limit: limit
        };
        // Perhatikan endpointnya beda: load_all_group_tabId
        return await this._secureRequest('/prod-app-api/video/shortPlay/tab/load_all_group_tabId', payload);
    }
}

export default NetshortAPI;