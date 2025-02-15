import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'public/templates');
    const templates = fs.readdirSync(templatesDir)
      .filter(dir => {
        // commits.jsonとstates.jsonの存在を確認
        const commitsPath = path.join(templatesDir, dir, 'commits.json');
        const statesPath = path.join(templatesDir, dir, 'states.json');
        return fs.existsSync(commitsPath) && fs.existsSync(statesPath);
      });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    return NextResponse.json({ templates: [] });
  }
}