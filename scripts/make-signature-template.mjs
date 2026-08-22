/**
 * สร้าง public/signature-template.png — พื้นเปล่าให้ผู้ใช้พิมพ์ไปเซ็นแล้วสแกนกลับมา
 *
 * ห้ามวาดกรอบหรือเส้นใด ๆ ลงไป — ผู้ใช้สแกนกลับมาแล้วอัปทั้งรูป
 * เส้นพวกนั้นจะติดไปโผล่ในช่องลายเซ็นบนเอกสาร PDF
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
const WHITE = [255, 255, 255];

const px = Buffer.alloc(WIDTH * HEIGHT * 3);
const setPixel = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
};

// พื้นขาวล้วน ไม่มีกรอบไม่มีเส้น — อะไรที่วาดไว้จะติดไปในเอกสารด้วย
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) setPixel(x, y, WHITE);
}

// ---- เขียนเป็นไฟล์ PNG (color type 2 = truecolor RGB 8-bit) ----
const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
for (let y = 0; y < HEIGHT; y += 1) {
  const rowStart = y * (1 + WIDTH * 3);
  raw[rowStart] = 0; // filter: none
  px.copy(raw, rowStart + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
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
ihdr[9] = 2; // color type: truecolor
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
console.log(`wrote ${out.pathname} — ${WIDTH}x${HEIGHT}, ${png.length} bytes`);
