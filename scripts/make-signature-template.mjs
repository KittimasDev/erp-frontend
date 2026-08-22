/**
 * สร้าง public/signature-template.png — ผืนโปร่งใสเปล่าให้ผู้ใช้เอาไปทำลายเซ็น
 *
 * ห้ามวาดกรอบหรือเส้นใด ๆ ลงไป — ผู้ใช้สแกนกลับมาแล้วอัปทั้งรูป
 * เส้นพวกนั้นจะติดไปโผล่ในช่องลายเซ็นบนเอกสาร PDF
 *
 * และต้องเป็น RGBA (color type 6) alpha = 0 ทั้งแผ่น ไม่ใช่พื้นขาวทึบ
 * เพราะถ้าใครเซ็นดิจิทัลทับ template แทนการพิมพ์ ไฟล์ที่ได้จะมีพื้นหลัง
 * โปร่งใสอยู่แล้ว ไม่กลายเป็นกล่องขาวไปทับเนื้อเอกสาร
 *
 * เขียน PNG ด้วยมือผ่าน zlib เพราะ repo ไม่มี lib ทำรูปฝั่ง node
 * (sharp/canvas/jimp ไม่มี — html2canvas รันบนเบราว์เซอร์เท่านั้น)
 *
 * รัน: node scripts/make-signature-template.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

/** 3:1 ให้ตรงกับสัดส่วนช่องลายเซ็นใน PDF เอกสารขาย */
const WIDTH = 1200;
const HEIGHT = 400;
/** RGBA */
const CHANNELS = 4;

// Buffer.alloc คืนไบต์ศูนย์ทั้งหมด = RGBA (0,0,0,0) = โปร่งใสสนิททุกพิกเซล
const px = Buffer.alloc(WIDTH * HEIGHT * CHANNELS);

// ---- เขียนเป็นไฟล์ PNG (color type 6 = truecolor + alpha, 8-bit) ----
const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * CHANNELS));
for (let y = 0; y < HEIGHT; y += 1) {
  const rowStart = y * (1 + WIDTH * CHANNELS);
  raw[rowStart] = 0; // filter: none
  px.copy(
    raw,
    rowStart + 1,
    y * WIDTH * CHANNELS,
    (y + 1) * WIDTH * CHANNELS,
  );
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: truecolor + alpha (RGBA)
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = new URL("../public/signature-template.png", import.meta.url);
writeFileSync(out, png);
console.log(
  `wrote ${out.pathname} — ${WIDTH}x${HEIGHT} RGBA โปร่งใส, ${png.length} bytes`,
);
