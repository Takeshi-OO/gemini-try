// src\lib\stability.ts
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import sharp from 'sharp';

const STABILITY_API_URL =
  process.env.STABILITY_API_URL || "https://api.stability.ai/v2beta/stable-image/generate/ultra";

// Inpainting用のエンドポイント
// 環境変数 STABILITY_API_URL があればそれを使い、未指定なら inpaint のURLを使う例
const STABILITY_INPAINT_URL =
  process.env.STABILITY_API_URL || "https://api.stability.ai/v2beta/stable-image/edit/inpaint";

export interface GenerateImageOptions {
  prompt: string;
  initImage?: string;
  outputFileName: string;
}

// 引数のインターフェース
export interface InpaintImageOptions {
  prompt: string;
  // 透過PNGをbase64で持っている想定 (data:image/png;base64,xxxx 形式)
  imageBase64: string;
  // マスク画像も同様にbase64で持つ (非透過部=白、透過部=黒)
  maskBase64: string;
  // 出力形式を任意指定 ("png" / "webp" / "jpeg" 等)
  outputFormat?: string;
}

async function prepareImageForStability(initImageBase64: string): Promise<Buffer> {
  const base64Data = initImageBase64.split(',')[1];
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // 画像のメタデータを取得
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  // 背景色を設定（マゼンタ）
  const background = { r: 255, g: 0, b: 255, alpha: 1 };

  // 透過部分を特定の色で塗りつぶす
  const processedImage = await sharp(imageBuffer)
    .ensureAlpha()
    .resize(width, height, {
      fit: 'contain',
      position: 'center',
      background: background
    })
    .composite([{
      input: {
        create: {
          width,
          height,
          channels: 4,
          background: background
        }
      },
      blend: 'dest-over'
    }])
    .removeAlpha()
    .png()
    .toBuffer();

  return processedImage;
}

async function restoreTransparency(generatedImageBuffer: Buffer, originalImageBase64: string): Promise<Buffer> {
  const base64Data = originalImageBase64.split(',')[1];
  const originalBuffer = Buffer.from(base64Data, 'base64');

  // オリジナル画像のメタデータを取得
  const originalMeta = await sharp(originalBuffer).metadata();
  const { width, height } = originalMeta;

  // 生成された画像をオリジナルと同じサイズにリサイズ
  const resizedGenerated = await sharp(generatedImageBuffer)
    .resize(width, height, {
      fit: 'contain',
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // オリジナル画像からアルファチャンネルを抽出
  const alphaChannel = await sharp(originalBuffer)
    .ensureAlpha()
    .extractChannel('alpha')
    .toBuffer();

  // 生成された画像にアルファチャンネルを適用
  const restoredImage = await sharp(resizedGenerated)
    .ensureAlpha()
    .joinChannel(alphaChannel)
    .png()
    .toBuffer();

  return restoredImage;
}

export async function generateImage(
  options: GenerateImageOptions,
  resourcesDir: string
): Promise<string> {
  try {
    if (!STABILITY_API_URL) {
      throw new Error("STABILITY_API_URL is not defined");
    }

    const form = new FormData();
    const adjustedPrompt = `${options.prompt}. No text or letters should be included.`;
    form.append("prompt", adjustedPrompt);

    if (options.initImage) {
      const preparedImageBuffer = await prepareImageForStability(options.initImage);
      form.append("image", preparedImageBuffer, { filename: "init_image.png" });
      form.append("strength", "0.9");
    }

    const response = await axios.post(STABILITY_API_URL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: "application/json",
      },
    });

    const generatedImageBase64 = response.data.image;
    const generatedImageBuffer = Buffer.from(generatedImageBase64, 'base64');

    const finalImageBuffer = options.initImage 
      ? await restoreTransparency(generatedImageBuffer, options.initImage)
      : generatedImageBuffer;

    const fileName = options.outputFileName || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    const outputPath = path.join(process.cwd(), "public", "projects", resourcesDir, fileName);
    
    // ディレクトリが存在しない場合は作成
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, finalImageBuffer);
    
    return fileName;

  } catch (error: any) {
    console.error("Image generation error:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * テンプレートPNGの「非透過部のみ」AI編集したい場合
 *  - imageBase64 : 元PNGをbase64化したもの
 *  - maskBase64  : 元PNGから作成した白黒マスク（非透過=白、透過=黒）
 */
export async function inpaintImage(
  {
    prompt,
    imageBase64,
    maskBase64,
    outputFormat = "png",
  }: InpaintImageOptions,
  outputDir: string
): Promise<string> {
  try {
    // base64 -> bufferに変換
    const imageBuffer = Buffer.from(imageBase64.split(",")[1], "base64");
    const maskBuffer = Buffer.from(maskBase64.split(",")[1], "base64");

    // multipart/form-dataで送信
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("output_format", outputFormat);

    // ファイルとして添付（filenameは仮でOK）
    form.append("image", imageBuffer, { filename: "image.png" });
    form.append("mask", maskBuffer, { filename: "mask.png" });

    // Stability AI (Inpainting) エンドポイントへリクエスト
    const response = await axios.post(STABILITY_INPAINT_URL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        // バイナリとして画像を受け取る
        Accept: "image/*",
      },
      // arraybuffer として受け取ると、response.data は生のバイナリ
      responseType: "arraybuffer",
    });

    if (response.status === 200) {
      // 出力用ディレクトリ生成（なければ）
      const fileName = `image_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}.${outputFormat}`;
      const outputPath = path.join(process.cwd(), "public", "output", outputDir, fileName);

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // バイナリデータをファイルとして保存
      fs.writeFileSync(outputPath, response.data);

      // 保存先ファイル名を返す
      return fileName;
    } else {
      throw new Error(`${response.status}: ${response.data.toString()}`);
    }
  } catch (error: any) {
    console.error("Inpainting error:", error.response?.data || error.message);
    throw error;
  }
}
