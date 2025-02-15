import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectDir = searchParams.get("projectDir");

    if (!projectDir) {
      return NextResponse.json({ error: "Project directory is required" }, { status: 400 });
    }

    const resourcesDir = path.join(process.cwd(), "public", "projects", projectDir, "resources");
    
    if (!fs.existsSync(resourcesDir)) {
      return NextResponse.json({ resources: [] });
    }

    const files = fs.readdirSync(resourcesDir);
    const resources = files
      .filter(file => file.startsWith('user-')) // 写真素材のみをフィルタリング
      .map(file => ({
        fileName: file,
        url: `/projects/${projectDir}/resources/${file}`,
        type: "material" // 写真素材として扱う
      }));

    return NextResponse.json({ resources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 