import NetshortAPI from './netshort-api.js';

const api = new NetshortAPI();

// -- UBAH BAGIAN INI --
// Kita buat login berjalan di awal, tapi tidak memblokir kode lain
console.log("Sedang mencoba login ke server NetShort...");
await api.login().then(res => {
    if(res.success) {
        console.log("✅ LOGIN SUKSES! Token didapat.");
    } else {
        console.log("❌ LOGIN GAGAL:", res);
    }
});
// ---------------------


const foryou = async (page) => {
    try {
        const res = await api.fetchRecommendAll(page);
        console.log(`✅ SUCCESS GET FOR YOU`);
        
        // --- TAMBAHAN KODE DEBUG (Salin bagian ini) ---
        console.log("=== INTIP DATA DARI SERVER ===");
        // Tampilkan struktur data lengkap agar kita tahu isinya
        console.log(JSON.stringify(res, null, 2)); 
        console.log("=================================");
        // ----------------------------------------------

        // Jika nanti ternyata datanya bukan di 'res.data', kita harus ubah baris bawah ini
        return res.data; 
    } catch (error) {
        throw error;
    }
}

const theaters = async () => {
    try {
        const res = await api.fetchTheaters();
        console.log(`✅ SUCCESS GET THEATERS`);
        return res.data;
    } catch (error) {
        throw error;
    }
}

const search = async (query) => {
    try {
        const res = await api.fetchSearch(query);
        console.log(`✅ SUCCESS GET SEARCH`);
        return res.data;
    } catch (error) {
        throw error;
    }
}

const allepisode = async (shortPlayId) => {
    try {
        const res = await api.fetchDetail(shortPlayId);
        console.log(`✅ SUCCESS GET ALLEPISODE`);
        return res.data;
    } catch (error) {
        throw error;
    }
}

export { foryou, theaters, search, allepisode };
export default { foryou, theaters, search, allepisode };

// console.log(loginRes);

// const theaters = await api.fetchTheaters();
// console.log(theaters.data);

// const detail = await api.fetchDetail("1978651390626316290");
// console.log(detail.data);

// const recs = await api.fetchRecommend("1894598206267256834");
// console.log(recs.data);

// const recAll = await api.fetchRecommendAll(2, 20);
// console.log(recAll.data);

// const search = await api.fetchSearch("pewaris");
// console.log(search.data);

// (async () => {
//     const api = new NetshortAPI();

//     console.log("=== 1. Login ===");
//     const loginRes = await api.login();
//     if (!loginRes.success) {
//         console.error("Login Gagal:", loginRes);
//         return;
//     }
//     console.log("Login Sukses! Token:", api.token.substring(0, 15) + "...");

//     console.log("\n=== 2. Fetch Theaters (Home) ===");
//     const theaters = await api.fetchTheaters();
//     let firstBookId = null;

//     if (theaters.data && theaters.data.length > 0) {
//         const firstGroup = theaters.data[0];
//         console.log(`Berhasil! Grup pertama: ${firstGroup.title}`);
        
//         // Ambil ID buku pertama untuk test fungsi lain
//         if (firstGroup.contentInfos && firstGroup.contentInfos.length > 0) {
//             firstBookId = firstGroup.contentInfos[0].shortPlayId;
//             console.log(`Menggunakan BookID untuk test: ${firstBookId}`);
//         }
//     } else {
//         console.log("Tidak ada data theaters.");
//     }

//     if (firstBookId) {
//         console.log("\n=== 3. Fetch Detail ===");
//         const detail = await api.fetchDetail(firstBookId);
//         // Cek struktur respon, biasanya ada di detail.data
//         const title = detail.data ? detail.data.title : "Unknown";
//         console.log(`Detail Drama: ${title} (Episodes: ${detail.data?.episodeCount || '?'})`);

//         console.log("\n=== 4. Fetch Recommend (Mirip) ===");
//         const recs = await api.fetchRecommend(firstBookId);
//         console.log(`Ditemukan ${recs.data ? recs.data.length : 0} rekomendasi.`);
//     }

//     console.log("\n=== 5. Search 'Love' ===");
//     const searchRes = await api.fetchSearch("Love");
//     if (searchRes.data && searchRes.data.list) {
//         console.log(`Hasil pencarian 'Love': ${searchRes.data.list.length} item ditemukan.`);
//         if(searchRes.data.list.length > 0) {
//             console.log(`Judul pertama: ${searchRes.data.list[0].title}`);
//         }
//     } else {
//         console.log("Pencarian tidak menemukan hasil.");
//     }

//     console.log("\n=== 6. Fetch Recommend All (Explore) ===");
//     const recAll = await api.fetchRecommendAll();
//     console.log(`Explore Data: ${recAll.data ? recAll.data.length : 0} grup.`);

// })();