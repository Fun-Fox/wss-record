/**
 * Icon Generator Script
 *
 * Run this script with Node.js to generate PNG icons for the extension.
 * Requires the 'canvas' package: npm install canvas
 *
 * Usage: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generation using minimal PNG encoding
// This creates valid PNG files without external dependencies

function createPixelBuffer(size) {
  return Buffer.alloc(size * size * 4);
}

function setPixel(buffer, size, x, y, r, g, b, a = 255) {
  const idx = (y * size + x) * 4;
  buffer[idx] = r;
  buffer[idx + 1] = g;
  buffer[idx + 2] = b;
  buffer[idx + 3] = a;
}

function drawCircle(buffer, size, cx, cy, radius, r, g, b, a = 255) {
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(size - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(size - 1, Math.ceil(cx + radius)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(buffer, size, x, y, r, g, b, a);
      }
    }
  }
}

function drawCircleOutline(buffer, size, cx, cy, radius, r, g, b, a = 255, lineWidth = 2) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist >= radius - lineWidth && dist <= radius + lineWidth) {
        setPixel(buffer, size, x, y, r, g, b, a);
      }
    }
  }
}

function drawLine(buffer, size, x1, y1, x2, y2, r, g, b, a = 255, lineWidth = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x1 + dx * t);
    const y = Math.round(y1 + dy * t);

    // Draw line with thickness
    for (let ly = -Math.floor(lineWidth / 2); ly <= Math.floor(lineWidth / 2); ly++) {
      for (let lx = -Math.floor(lineWidth / 2); lx <= Math.floor(lineWidth / 2); lx++) {
        if (x + lx >= 0 && x + lx < size && y + ly >= 0 && y + ly < size) {
          setPixel(buffer, size, x + lx, y + ly, r, g, b, a);
        }
      }
    }
  }
}

// PNG chunk helpers
function createChunk(chunkType, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const type = Buffer.from(chunkType);

  const crcData = Buffer.concat([type, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));

  return Buffer.concat([length, type, data, crc]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createPNG(width, height, pixelData) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // IDAT chunk (raw pixel data with filter byte)
  const raw = Buffer.alloc(width * height * 4 + height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter byte (none)
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (width * 4 + 1) + 1 + x * 4;
      raw[dstIdx] = pixelData[srcIdx];
      raw[dstIdx + 1] = pixelData[srcIdx + 1];
      raw[dstIdx + 2] = pixelData[srcIdx + 2];
      raw[dstIdx + 3] = pixelData[srcIdx + 3];
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw);

  // IEND chunk
  const iendData = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdrData),
    createChunk('IDAT', compressed),
    createChunk('IEND', iendData)
  ]);
}

function generateIcon(size) {
  const buffer = createPixelBuffer(size);
  const center = size / 2;

  // Background - rounded rectangle effect with gradient-like fill
  const bgColor1 = { r: 0, g: 122, b: 204 };
  const bgColor2 = { r: 0, g: 95, b: 163 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded corners
      const cornerRadius = size * 0.18;
      let inCorner = false;
      let cx, cy;

      if (x < cornerRadius && y < cornerRadius) {
        cx = cornerRadius; cy = cornerRadius;
        inCorner = true;
      } else if (x >= size - cornerRadius && y < cornerRadius) {
        cx = size - cornerRadius; cy = cornerRadius;
        inCorner = true;
      } else if (x < cornerRadius && y >= size - cornerRadius) {
        cx = cornerRadius; cy = size - cornerRadius;
        inCorner = true;
      } else if (x >= size - cornerRadius && y >= size - cornerRadius) {
        cx = size - cornerRadius; cy = size - cornerRadius;
        inCorner = true;
      }

      if (inCorner) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > cornerRadius) {
          setPixel(buffer, size, x, y, 0, 0, 0, 0);
          continue;
        }
      }

      // Gradient background
      const t = (x + y) / (size * 2);
      const r = Math.round(bgColor1.r + (bgColor2.r - bgColor1.r) * t);
      const g = Math.round(bgColor1.g + (bgColor2.g - bgColor1.g) * t);
      const b = Math.round(bgColor1.b + (bgColor2.b - bgColor1.b) * t);
      setPixel(buffer, size, x, y, r, g, b, 255);
    }
  }

  // Main circle outline
  const mainRadius = size * 0.22;
  drawCircleOutline(buffer, size, center, center, mainRadius, 255, 255, 255, 255, size * 0.03);

  // Center dot
  drawCircle(buffer, size, center, center, size * 0.06, 255, 255, 255, 255);

  // Connection points and lines
  const connRadius = size * 0.35;
  const pointRadius = size * 0.05;
  const lineRadius = size * 0.15;

  // Top-left connection (green - receive)
  const tlX = center - connRadius * 0.7;
  const tlY = center - connRadius * 0.7;
  drawLine(buffer, size, tlX + pointRadius, tlY + pointRadius, center - lineRadius * 0.5, center - lineRadius * 0.5, 78, 201, 81, 255, size * 0.025);
  drawCircle(buffer, size, tlX, tlY, pointRadius, 78, 201, 81, 255);

  // Top-right connection (red - send)
  const trX = center + connRadius * 0.7;
  const trY = center - connRadius * 0.7;
  drawLine(buffer, size, trX - pointRadius, trY + pointRadius, center + lineRadius * 0.5, center - lineRadius * 0.5, 244, 71, 71, 255, size * 0.025);
  drawCircle(buffer, size, trX, trY, pointRadius, 244, 71, 71, 255);

  // Bottom connection (orange)
  const bX = center;
  const bY = center + connRadius * 0.7;
  drawLine(buffer, size, bX, bY - pointRadius, center, center + lineRadius * 0.5, 206, 145, 120, 255, size * 0.025);
  drawCircle(buffer, size, bX, bY, pointRadius, 206, 145, 120, 255);

  // Record dot (bottom-right)
  const recX = center + size * 0.25;
  const recY = center + size * 0.25;
  drawCircle(buffer, size, recX, recY, size * 0.08, 244, 71, 71, 255);

  return createPNG(size, size, buffer);
}

// Generate icons
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'src', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const png = generateIcon(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
});

console.log('All icons generated successfully!');
