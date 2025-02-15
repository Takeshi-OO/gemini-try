// remotion-server/videoRender.cjs

const { bundle } = require("@remotion/bundler");
const { getCompositions, renderMedia } = require("@remotion/renderer");
const path = require("path");

/**
 * generateVideoFromSlides
 *   カスタマイズ済みスライド情報を受け取り、Remotionで動画を生成する
 *   slides: Array of "slide" objects (no explicit TypeScript types used here)
 */
async function generateVideoFromSlides(slides) {
  // Remotionのエントリーポイント (JSX/TSXのパスはそのままOK)
  const entry = path.join(process.cwd(), "src", "remotion", "Root.tsx");

  // 1. バンドル
  const bundled = await bundle(entry, () => undefined, {
    webpackOverride: (config) => config,
  });

  // 2. コンポジションを取得
  const comps = await getCompositions(bundled, {
    inputProps: { slides },
  });

  const composition = comps.find((c) => c.id === "MyVideo");
  if (!composition) {
    throw new Error("No composition with id 'MyVideo' found");
  }

  // 3. レンダリング
  const outputLocation = path.join(
    process.cwd(),
    "public",
    `output-${Date.now()}.mp4`
  );

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    inputProps: { slides },
    outputLocation,
  });

  // 4. 動画ファイルパスを返却
  return outputLocation;
}

// CommonJS のエクスポート
module.exports = {
  generateVideoFromSlides,
};