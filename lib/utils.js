import crypto from "crypto";

export default class DramaboxUtil {
  constructor() {
    this.privateKey = null;
    this.initPrivateKey();
  }

  decodeString(str = "") {
    let result = "";
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 33 && c <= 126) {
        c -= 20;
        if (c < 33) c += 126 - 33;
      }
      result += String.fromCharCode(c);
    }
    return result;
  }

  initPrivateKey() {
    try {
      const part1 = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28";
      
      // MENGGUNAKAN STRING AMAN (CONCATENATION)
      // Jangan diubah-ubah spasi/kutipnya
      const rawPart2 = 'l|d,WL$EI,?xyw+*)^#?U`[whXlG`-GZif,.jCxbKkaY"{w*y]_jaxY%X7&z|K>L[7(0g!5CK@6:yH@.?;>@I"_`^:aC65C<J9G>L%2?t7-7)220/.?4+?#<7!\\Z';
      const part2 = this.decodeString(rawPart2);

      const rawPart3 = "m}e-XM%FJ-@yzx,+]_$@V_a|xYmH_aH[jg-0kDwcLl`Z#{x+z^`kbzZ&Y8'{}L?M\\8)1h\"6DLA7;zIA/?=>?J#^a_;&b?@:A;K:H?M&3@u8.8*3310/@5,@$<8\"\\Z";
      const part3 = this.decodeString(rawPart3);

      const part4 = "xCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";

      const fullPem = part1 + part2 + part3 + part4;
      const formattedKey = `-----BEGIN PRIVATE KEY-----\n${fullPem}\n-----END PRIVATE KEY-----`;

      this.privateKey = crypto.createPrivateKey({
        key: formattedKey,
        format: "pem",
        type: "pkcs8",
      });
    } catch (error) {
      console.error("UTILS ERROR: Gagal init private key. Cek string part2/part3.", error.message);
    }
  }

  sign(data) {
    if (!this.privateKey) {
        console.error("UTILS ERROR: Private Key null. Tidak bisa sign.");
        return null;
    }
    try {
      const sign = crypto.createSign("SHA256");
      sign.update(data);
      sign.end();
      return sign.sign(this.privateKey, "hex");
    } catch (error) {
      console.error("UTILS ERROR: Signing gagal:", error.message);
      return null;
    }
  }

  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  randomAndroidId() {
    return [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  }

  generateRandomIP() {
    return (
      Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255)
    );
  }
}