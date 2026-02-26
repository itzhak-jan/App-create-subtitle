#!/usr/bin/env node
'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0);
}

function createPNG(width, height, r, g, b) {
  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dataBytes.length, 0);
    const crcInput = Buffer.concat([typeBytes, dataBytes]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBytes, dataBytes, crcVal]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Raw pixel data
  const rows = [];
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    row[1 + x*3] = r;
    row[1 + x*3 + 1] = g;
    row[1 + x*3 + 2] = b;
  }
  for (let y = 0; y < height; y++) {
    rows.push(row);
  }
  const rawData = Buffer.concat(rows);
  const idatData = zlib.deflateSync(rawData);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Ensure assets dir exists
const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

const assets = [
  ['icon.png', 512, 512, 26, 26, 46],
  ['splash.png', 640, 1280, 26, 26, 46],
  ['adaptive-icon.png', 512, 512, 233, 69, 96],
  ['notification-icon.png', 96, 96, 233, 69, 96],
];

for (const [name, w, h, r, g, b] of assets) {
  const png = createPNG(w, h, r, g, b);
  const p = path.join(assetsDir, name);
  fs.writeFileSync(p, png);
  console.log('Created', p, '(' + png.length + ' bytes)');
}

console.log('All assets created successfully!');
