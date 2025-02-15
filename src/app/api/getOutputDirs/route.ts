import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface OutputMetadata {
  template?: string;
  userPrompt?: string;
  uploadedImages?: string[];
  timestamp?: number;
  projectDir?: string;
  versionDir?: string;
}

export async function GET() {
  try {
    const projectsDir = path.join(process.cwd(), "public", "projects");
    
    if (!fs.existsSync(projectsDir)) {
      return NextResponse.json({ projects: [] });
    }
    
    const projectDirs = fs.readdirSync(projectsDir)
      .filter(dir => dir.startsWith('project'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('project', ''));
        const numB = parseInt(b.replace('project', ''));
        return numB - numA;  // 新しい順に並べる
      });

    const projects = projectDirs.map(projectDir => {
      const projectPath = path.join(projectsDir, projectDir);
      const versionDirs = fs.readdirSync(projectPath)
        .filter(dir => dir.startsWith('version'))
        .sort((a, b) => {
          const numA = parseInt(a.replace('version', ''));
          const numB = parseInt(b.replace('version', ''));
          return numB - numA;  // 新しい順に並べる
        });

      const versions = versionDirs.map(versionDir => {
        const versionPath = path.join(projectPath, versionDir);
        const metadataPath = path.join(versionPath, 'metadata.json');
        let metadata: OutputMetadata = {};
        
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          } catch (error) {
            console.error(`Error reading metadata for ${projectDir}/${versionDir}:`, error);
          }
        }

        // リソースディレクトリ内のuser-*ファイルを探し、完全なURLパスを構築
        const resourcesPath = path.join(projectPath, 'resources');
        const userImages = fs.existsSync(resourcesPath) 
          ? fs.readdirSync(resourcesPath)
              .filter(file => file.startsWith('user-'))
              .map(file => `/projects/${projectDir}/resources/${file}`)
          : [];

        return {
          versionDir,
          ...metadata,
          uploadedImages: userImages
        };
      });

      return {
        projectDir,
        versions
      };
    });
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error getting project directories:", error);
    return NextResponse.json({ projects: [] });
  }
} 