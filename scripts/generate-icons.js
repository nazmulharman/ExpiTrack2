import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(8 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = crc32(buffer.subarray(4, 8 + length));
  buffer.writeUInt32BE(crc >>> 0, 8 + length);
  return buffer;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Icon Drawer with ExpiTrack brand styling (Shield, Vault, Emerald/Teal accents)
function drawAppIcon(isMaskable) {
  return (x, y, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = w * 0.46;

    // Corner radius for app icon (rounded squircle or circle)
    const isCorner = !isMaskable && dist > radius;
    if (isCorner) {
      return [0, 0, 0, 0]; // Transparent outside icon bounds if not maskable
    }

    // Base background gradient: #0f766e to #131b2e
    const gradFactor = (y / h);
    const bgR = Math.round(15 * (1 - gradFactor) + 19 * gradFactor);
    const bgG = Math.round(118 * (1 - gradFactor) + 27 * gradFactor);
    const bgB = Math.round(110 * (1 - gradFactor) + 46 * gradFactor);

    // Inner shield/vault emblem shape
    const scale = isMaskable ? 0.65 : 0.78;
    const sx = dx / (w * scale * 0.5);
    const sy = (dy + h * 0.04) / (h * scale * 0.5);

    // Shield formula: |sx| <= 1 - 0.3*sy (for top), curved at bottom
    const inShieldTop = sy >= -0.85 && sy <= 0.2 && Math.abs(sx) <= 0.85;
    const inShieldBottom = sy > 0.2 && sy <= 0.95 && Math.abs(sx) <= (0.85 - 0.75 * Math.pow((sy - 0.2) / 0.75, 1.4));

    if (inShieldTop || inShieldBottom) {
      // Glow edge
      const edgeDist = Math.min(
        Math.abs(sx),
        Math.abs(sy + 0.85)
      );

      // Checkmark & clock inner motif
      const inClock = (Math.sqrt(sx * sx + (sy + 0.1) * (sy + 0.1)) < 0.38);
      if (inClock) {
        // Neon mint #6df5e1
        return [109, 245, 225, 255];
      }

      // Shield body: deep emerald teal #005c55
      return [0, 92, 85, 255];
    }

    // Background fill
    return [bgR, bgG, bgB, 255];
  };
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate standard icons
const icon192 = createPNG(192, 192, drawAppIcon(false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPNG(512, 512, drawAppIcon(false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const maskable512 = createPNG(512, 512, drawAppIcon(true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskable512);

const appleTouchIcon = createPNG(180, 180, drawAppIcon(false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

console.log('Successfully generated PWA and Android APK icons!');
