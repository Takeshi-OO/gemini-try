import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const projectDir = formData.get("projectDir") as string;
    const versionDir = formData.get("versionDir") as string;
    const slideId = formData.get("slideId") as string;

    if (!image || !projectDir || !versionDir || !slideId) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    // 新しいディレクトリ構造に基づいてパスを作成
    const slideDir = path.join(
      process.cwd(),
      "public",
      "projects",
      projectDir,
      "slides",
      slideId,
      versionDir
    );

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(slideDir)) {
      fs.mkdirSync(slideDir, { recursive: true });
    }

    // 画像をバッファに変換
    const buffer = Buffer.from(await image.arrayBuffer());

    // 画像を保存（ファイル名をslideId.pngに変更）
    const imagePath = path.join(slideDir, `${slideId}.png`);
    fs.writeFileSync(imagePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "画像の保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 