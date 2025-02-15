import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getFormattedTimestamp } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const projectDir = formData.get("projectDir") as string;
    const resourcesDir = formData.get("resourcesDir") as string;

    if (!image || !projectDir || !resourcesDir) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ファイル名を生成
    const timestamp = getFormattedTimestamp();
    const extension = image.type.split("/")[1];
    const fileName = `user-${timestamp}.${extension}`;

    // 保存先のパスを構築
    const outputDir = path.join(process.cwd(), "public", "projects", projectDir, "resources");
    const filePath = path.join(outputDir, fileName);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // ファイルを保存
    await fs.promises.writeFile(filePath, buffer);

    return NextResponse.json({ fileName });
  } catch (error) {
    console.error("画像アップロードエラー:", error);
    return NextResponse.json(
      { error: "画像のアップロードに失敗しました" },
      { status: 500 }
    );
  }
} 