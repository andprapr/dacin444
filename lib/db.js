import mongoose from 'mongoose';

// Ganti baris URI dengan ini:
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://jasitusnet_db_user:nt7YA4Reik6NN21G@dracindb.2wwsnmc.mongodb.net/?retryWrites=true&w=majority&appName=DracinDB";

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Sukses Konek ke MongoDB Atlas");
    } catch (error) {
        console.error("❌ Gagal Konek MongoDB:", error);
    }
};

// DEFINISI SKEMA (Hanya boleh ada satu)
const settingsSchema = new mongoose.Schema({
    siteName: { type: String, default: "StreamHub Indo" },
    // Tambahan baru di sini:
    siteDescription: { type: String, default: "Platform streaming drama pendek Asia dengan subtitle & dubbing Indonesia terlengkap." }, 
    logoUrl: { type: String, default: "" },
    adminPassword: { type: String, default: "admin123" },
    activeApis: { type: [String], default: ["NetShort", "DramaBox"] } 
});

// Cek apakah model sudah ada, jika belum baru buat
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

export { connectDB, Settings };