import crypto from 'crypto';
import { RSA_PUBLIC_KEY, RSA_PRIVATE_KEY } from './config.js';

// --- Helper Random ---

export function randomHex(len = 16) {
    return crypto.randomBytes(len).toString("hex");
}

function randomAndroidModel() {
    const models = [
        "Pixel 6", "Pixel 7", "Pixel 8", "Pixel 6a",
        "Galaxy S21", "Galaxy S22", "Galaxy S23",
        "Redmi Note 11", "Redmi Note 12", "ONEPLUS A6003", "CPH2411",
    ];
    return models[Math.floor(Math.random() * models.length)];
}

function randomChromeVersion() {
    const major = 85 + Math.floor(Math.random() * 15);
    const build = Math.floor(1000 + Math.random() * 8000);
    return `${major}.0.${build}.120`;
}

export function buildUserAgent() {
    return (
        `Mozilla/5.0 (Linux; Android 12; ${randomAndroidModel()} Build/SP1A.210812.015; wv) ` +
        `AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${randomChromeVersion()} Mobile Safari/537.36`
    );
}

// --- Helper Enkripsi ---

function genAesKey(length = 32) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(length);
    let result = "";
    for (let i = 0; i < length; i++) {
        result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
}

export function encryptRequestPayload(jsonDataOrString) {
    const payloadStr = typeof jsonDataOrString === "string" 
        ? jsonDataOrString 
        : JSON.stringify(jsonDataOrString);

    const aesKeyStr = genAesKey(32);
    const aesKeyBytes = Buffer.from(aesKeyStr, "utf8");

    const cipher = crypto.createCipheriv("aes-256-ecb", aesKeyBytes, null);
    cipher.setAutoPadding(true);
    
    const encryptedBody = Buffer.concat([
        cipher.update(Buffer.from(payloadStr, "utf8")),
        cipher.final(),
    ]);
    const bodyB64 = encryptedBody.toString("base64");

    const aesKeyB64 = Buffer.from(aesKeyBytes).toString("base64");
    const encryptedKeyBuf = crypto.publicEncrypt(
        {
            key: RSA_PUBLIC_KEY,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(aesKeyB64, "utf8")
    );
    const headerKeyB64 = encryptedKeyBuf.toString("base64");

    return { bodyB64, headerKeyB64 };
}

export function decryptResponsePayload(headerEncryptKey, bodyText) {
    try {
        const encKeyBytes = Buffer.from(headerEncryptKey, "base64");

        // PERBAIKAN: Menggunakan NO_PADDING dan unpad manual
        // untuk melewati pembatasan keamanan Node.js v20+ pada PKCS1_PADDING
        const rsaDecryptedRaw = crypto.privateDecrypt(
            {
                key: RSA_PRIVATE_KEY,
                padding: crypto.constants.RSA_NO_PADDING, // Padding dimatikan di level library
            },
            encKeyBytes
        );

        // Manual Unpadding PKCS#1 v1.5 (Block Type 2)
        // Struktur: 00 02 [padding acak...] 00 [data]
        let start = -1;
        
        // Cari byte 0x00 pemisah setelah padding (dimulai dari byte ke-2)
        for (let i = 2; i < rsaDecryptedRaw.length; i++) {
            if (rsaDecryptedRaw[i] === 0x00) {
                start = i + 1;
                break;
            }
        }

        if (start === -1) {
             throw new Error("Gagal Dekripsi RSA: Separator padding tidak ditemukan.");
        }

        // Ambil data setelah separator
        const dataBytes = rsaDecryptedRaw.subarray(start);
        
        // Data hasil dekripsi adalah AES Key dalam bentuk string Base64
        const aesKeyStr = dataBytes.toString('utf8');
        const aesKey = Buffer.from(aesKeyStr, "base64");

        // Lanjut dekripsi AES seperti biasa
        const bodyBytes = Buffer.from(bodyText, "base64");
        const decipher = crypto.createDecipheriv("aes-256-ecb", aesKey, null);
        decipher.setAutoPadding(true);
        const decryptedRaw = Buffer.concat([
            decipher.update(bodyBytes),
            decipher.final(),
        ]);

        return JSON.parse(decryptedRaw.toString("utf8"));
    } catch (e) {
        return { error: e.message, raw_body: bodyText };
    }
}