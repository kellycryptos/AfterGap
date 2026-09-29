import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// 1. Sleek SVG Brand Logo definition
export const AFTERGAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#141419" />
      <stop offset="100%" stop-color="#09090C" />
    </linearGradient>
    <linearGradient id="goldPillar" x1="0" y1="48" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E5A91E" />
      <stop offset="100%" stop-color="#FCD34D" />
    </linearGradient>
    <linearGradient id="greenPillar" x1="0" y1="48" x2="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Base with 1px gold border -->
  <rect width="48" height="48" rx="12" fill="url(#bgGrad)" />
  <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="11.25" stroke="#F5C542" stroke-opacity="0.3" stroke-width="1.5" />

  <!-- Dual Wrapper GAP Mark (The 'A' with price divergence gap) -->
  <!-- Left Pillar (bStocks Gold) -->
  <path d="M12 36L20.5 13C20.8 12.2 21.6 12.2 22 13L23.2 16.5L16.8 36H12Z" fill="url(#goldPillar)" filter="url(#subtleGlow)" />

  <!-- Right Pillar (Ondo Emerald / Shifted higher with the arbitrage GAP) -->
  <path d="M25 12.5C25.3 11.7 26.2 11.7 26.6 12.5L34 31H29.5L23.8 17.5L25 12.5Z" fill="url(#greenPillar)" filter="url(#subtleGlow)" />

  <!-- The Gap Bridge Indicator -->
  <rect x="15" y="25" width="16" height="3.5" rx="1.75" fill="#F5F5F4" />
  <circle cx="30" cy="26.75" r="1.75" fill="#F5C542" />
</svg>`;

// Pure Node.js PNG builder using zlib
function buildPng(width: number, height: number, getPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  function crc32(buf: Buffer): number {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
    return ~c >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Rasterizer for the AfterGap squircle and dual pillars
function generateBrandPixel(width: number, height: number) {
  const cornerR = width * 0.25;
  return (x: number, y: number): [number, number, number, number] => {
    // Normalised coordinates [0, 1]
    const u = x / width;
    const v = y / height;

    // Squircle distance check
    const dx = Math.max(0, Math.abs(x - width / 2) - (width / 2 - cornerR));
    const dy = Math.max(0, Math.abs(y - height / 2) - (height / 2 - cornerR));
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > cornerR) return [0, 0, 0, 0]; // Transparent outside squircle

    // Border check
    const isBorder = dist > cornerR - 1.5 ||
      ((x <= 1.5 || x >= width - 2.5 || y <= 1.5 || y >= height - 2.5) && dist <= cornerR);

    if (isBorder) {
      return [245, 197, 66, 160]; // Gold border
    }

    // Inside squircle: Background is #0A0A0E with subtle dark gradient
    let bgR = 12 + Math.floor(v * 4);
    let bgG = 12 + Math.floor(v * 4);
    let bgB = 16 + Math.floor(v * 4);

    // Left pillar (Gold bStocks): runs from (0.24, 0.76) to (0.45, 0.26)
    // Line: (v - 0.76) = -2.38 * (u - 0.24) => u = 0.24 - (v - 0.76)/2.38 = 0.56 - 0.42*v
    const leftCenterU = 0.56 - 0.42 * v;
    const isLeftPillar = v >= 0.26 && v <= 0.76 && Math.abs(u - leftCenterU) <= 0.08;

    // Right pillar (Emerald Ondo with GAP): runs from (0.52, 0.26) to (0.72, 0.66)
    // Line: u = 0.52 + 0.5 * (v - 0.26) = 0.39 + 0.5 * v
    const rightCenterU = 0.39 + 0.5 * v;
    const isRightPillar = v >= 0.25 && v <= 0.66 && Math.abs(u - rightCenterU) <= 0.08;

    // Horizontal Bridge Bar at v ~ 0.52, u from 0.30 to 0.65
    const isBridge = v >= 0.50 && v <= 0.56 && u >= 0.30 && u <= 0.65;

    if (isBridge) {
      return [245, 245, 244, 255]; // Off-white bridge
    }
    if (isLeftPillar) {
      return [245, 197, 66, 255]; // Gold left bar
    }
    if (isRightPillar) {
      return [52, 211, 153, 255]; // Emerald right bar
    }

    return [bgR, bgG, bgB, 255];
  };
}

// Single-icon ICO file generator wrapping a 32x32 PNG
function buildIco(png32: Buffer): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Icon type
  header.writeUInt16LE(1, 4); // 1 image

  const dir = Buffer.alloc(16);
  dir[0] = 32; // Width
  dir[1] = 32; // Height
  dir[2] = 0; // Colors (0 = 256+)
  dir[3] = 0; // Reserved
  dir.writeUInt16LE(1, 4); // Planes
  dir.writeUInt16LE(32, 6); // Bits per pixel
  dir.writeUInt32LE(png32.length, 8); // Size of image
  dir.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  return Buffer.concat([header, dir, png32]);
}

function run() {
  console.log('Generating AfterGap brand vectors and icon assets...');

  const png16 = buildPng(16, 16, generateBrandPixel(16, 16));
  const png32 = buildPng(32, 32, generateBrandPixel(32, 32));
  const png180 = buildPng(180, 180, generateBrandPixel(180, 180));
  const png512 = buildPng(512, 512, generateBrandPixel(512, 512));
  const ico = buildIco(png32);

  const targets = [
    { dir: 'apps/web/public', writeSvg: true },
    { dir: 'apps/web/app', writeSvg: true },
  ];

  for (const { dir, writeSvg } of targets) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (writeSvg) {
      fs.writeFileSync(path.join(dir, 'icon.svg'), AFTERGAP_SVG, 'utf-8');
      fs.writeFileSync(path.join(dir, 'favicon.svg'), AFTERGAP_SVG, 'utf-8');
    }
    fs.writeFileSync(path.join(dir, 'icon.png'), png512);
    fs.writeFileSync(path.join(dir, 'apple-icon.png'), png180);
    fs.writeFileSync(path.join(dir, 'favicon-32x32.png'), png32);
    fs.writeFileSync(path.join(dir, 'favicon-16x16.png'), png16);
    fs.writeFileSync(path.join(dir, 'favicon.ico'), ico);
  }

  console.log('✅ Successfully generated AfterGap icons across apps/web/public and apps/web/app');
}

run();
