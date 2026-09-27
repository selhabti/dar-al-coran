import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { rootDir } from "./_env.mjs";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function drawIcon(size, { maskable }) {
  const pixels = Buffer.alloc(size * size * 4);
  const background = [15, 118, 110, 255];
  const foreground = [255, 255, 255, 255];
  const scale = maskable ? 0.56 : 0.68;
  const radius = maskable ? size / 2 : size * 0.22;

  const segments = [
    [0.26, 0.52, 0.43, 0.7],
    [0.43, 0.7, 0.75, 0.33],
  ].map(([x1, y1, x2, y2]) => [
    (x1 * 2 - 1) * (size * scale) + size / 2,
    (y1 * 2 - 1) * (size * scale) + size / 2,
    (x2 * 2 - 1) * (size * scale) + size / 2,
    (y2 * 2 - 1) * (size * scale) + size / 2,
  ]);
  const stroke = size * 0.11;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const cx = x + 0.5;
      const cy = y + 0.5;

      let color = background;
      let alpha = 255;

      if (!maskable) {
        const nearLeft = Math.min(cx, size - cx);
        const nearTop = Math.min(cy, size - cy);
        if (nearLeft < radius || nearTop < radius) {
          const dx = Math.max(radius - nearLeft, 0);
          const dy = Math.max(radius - nearTop, 0);
          alpha = Math.round(255 * Math.max(0, 1 - Math.hypot(dx, dy)));
        }
      }

      for (const [ax, ay, bx, by] of segments) {
        if (distanceToSegment(cx, cy, ax, ay, bx, by) <= stroke / 2) {
          color = foreground;
          alpha = 255;
        }
      }

      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = alpha;
    }
  }

  return encodePng(size, pixels);
}

const targets = [
  { path: join(rootDir, "public/icons/icon-192.png"), size: 192, maskable: false },
  { path: join(rootDir, "public/icons/icon-512.png"), size: 512, maskable: false },
  { path: join(rootDir, "public/icons/icon-maskable-512.png"), size: 512, maskable: true },
  { path: join(rootDir, "src/app/apple-icon.png"), size: 180, maskable: false },
  { path: join(rootDir, "src/app/icon.png"), size: 64, maskable: false },
];

for (const target of targets) {
  await mkdir(dirname(target.path), { recursive: true });
  await writeFile(target.path, drawIcon(target.size, { maskable: target.maskable }));
  console.log("ecrit", target.path.replace(`${rootDir}\\`, ""));
}

console.log("Icones generees.");
