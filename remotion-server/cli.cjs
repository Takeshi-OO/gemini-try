#!/usr/bin/env node
/* 
  1. JSON文字列として渡された "slides" をパースし、
  2. videoRender.ts の generateVideoFromSlides() を呼び、
  3. 結果パスをコンソールに出力
*/
const path = require('path');
const fs = require('fs');

// ここはトランスパイルなしで動くよう、TS → JS にしておく or requireで使う
const { generateVideoFromSlides } = require("./videoRender.cjs");

(async () => {
  try {
    // CLI引数からslidesを取得
    const rawSlides = process.argv[2] || '[]';
    const slides = JSON.parse(rawSlides);
    const outputPath = await generateVideoFromSlides(slides);
    // 生成完了したら stdout にパスを出す
    console.log(outputPath);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
