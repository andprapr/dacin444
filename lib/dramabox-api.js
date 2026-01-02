import axios from 'axios';
import { BASE_URL, APP_VER } from './dramabox-config.js'; // Import dari config DramaBox
import { 
    randomHex, 
    buildUserAgent, 
    encryptRequestPayload, 
    decryptResponsePayload 
} from './crypto-helper.js'; // Kita gunakan helper enkripsi yang sama

class DramaBoxAPI {
    constructor() {
        this.client = axios.create({ timeout: 30000 });
        this.deviceCode = randomHex(8);
        this.userAgent = buildUserAgent(); // User agent mungkin perlu diganti "DramaBox/..."
    }

    async _secureRequest(endpoint, payloadData) {
        const url = `${BASE_URL}${endpoint}`;
        const payloadStr = typeof payloadData === "string" ? payloadData : JSON.stringify(payloadData);
        const { bodyB64, headerKeyB64 } = encryptRequestPayload(payloadStr);
        const ts = Date.now().toString();

        const headers = {
            // Header ini mungkin berbeda untuk DramaBox, sesuaikan jika error
            "Host": "api.dramabox.com", 
            "Canary": "v2",
            "Os": "1",
            "Version": APP_VER,
            "Encrypt-Key": headerKeyB64,
            "Device-Code": this.deviceCode,
            "Content-Type": "application/json",
            "User-Agent": this.userAgent,
            "Timestamp": ts,
        };

        try {
            const resp = await this.client.post(url, bodyB64, { headers });
            const serverKey = resp.headers["encrypt-key"];
            if (!serverKey) throw new Error("Encrypt-Key missing");
            
            const body = typeof resp.data === "string" ? resp.data.trim() : String(resp.data).trim();
            return decryptResponsePayload(serverKey, body);
        } catch (err) {
            console.error(`DramaBox API Error [${endpoint}]:`, err.message);
            return { error: err.message };
        }
    }

    // --- ENDPOINTS (Disesuaikan dengan Screenshot Anda) ---

    // 1. For You / Rekomendasi
    async fetchForYou(pageNo = 1, limit = 20) {
        const offset = (pageNo - 1) * limit;
        // Gunakan endpoint yang sama dengan NetShort dulu sebagai tebakan
        const payload = { tabId: null, offset: offset, limit: limit };
        return await this._secureRequest('/prod-app-api/video/shortPlay/tab/load_all_group_tabId', payload);
    }

    // 2. Search
    async fetchSearch(query, pageNo = 1) {
        const payload = { searchCode: query, pageNo: pageNo, pageSize: 20, searchFlag: 1 };
        return await this._secureRequest('/prod-app-api/video/shortPlay/search/searchByKeyword', payload);
    }

    // 3. Detail & Episode
    async fetchDetail(bookId) {
        const payload = { shortPlayId: bookId, playClarity: "1080p" };
        return await this._secureRequest('/prod-app-api/video/shortPlay/base/detail_info', payload);
    }

    // 4. Trending (Tambahan sesuai gambar)
    async fetchTrending(pageNo = 1) {
        // Biasanya trending punya tabId khusus, misal 1 atau 2
        const payload = { tabId: "1", offset: (pageNo-1)*20, limit: 20 };
        return await this._secureRequest('/prod-app-api/video/shortPlay/tab/load_group_tabId', payload);
    }

    // 5. Dubbing Indo (Sesuai gambar)
    async fetchDubIndo(pageNo = 1) {
        // Kita asumsikan dub indo adalah pencarian dengan keyword khusus atau tabId tertentu
        // Untuk saat ini kita pakai search "Indo"
        return await this.fetchSearch("Indo", pageNo);
    }
}

export default DramaBoxAPI;