import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { projectDir, slideData, slideId, version } = await request.json();

    if (!projectDir || !slideData || !slideId || !version) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    // プロジェクトのルートディレクトリ
    const projectRoot = path.join(process.cwd(), "public", "projects", projectDir);

    // states.jsonを読み込む
    const statesPath = path.join(projectRoot, "states.json");
    const states = JSON.parse(fs.readFileSync(statesPath, 'utf-8'));

    // commits.jsonを読み込む
    const commitsPath = path.join(projectRoot, "commits.json");
    const commits = JSON.parse(fs.readFileSync(commitsPath, 'utf-8'));

    // 新しいスライドディレクトリを作成
    const newSlideDir = path.join(projectRoot, "slides", slideId, version);
    fs.mkdirSync(newSlideDir, { recursive: true });

    // スライドJSONを保存
    const slideJsonPath = path.join(newSlideDir, `${slideId}.json`);
    fs.writeFileSync(slideJsonPath, JSON.stringify(slideData, null, 2));

    // 新しいstateを作成
    const newState = {
      id: uuidv4(),
      slides: {
        ...states[states.length - 1].slides,
        [slideId]: version
      }
    };
    states.push(newState);

    // 新しいcommitを作成
    const newCommit = {
      id: uuidv4(),
      stateId: newState.id,
      message: `Update ${slideId}`,
      timestamp: new Date().toISOString()
    };
    commits.push(newCommit);

    // states.jsonとcommits.jsonを更新
    fs.writeFileSync(statesPath, JSON.stringify(states, null, 2));
    fs.writeFileSync(commitsPath, JSON.stringify(commits, null, 2));

    return NextResponse.json({
      success: true,
      stateId: newState.id,
      commitId: newCommit.id
    });
  } catch (error: any) {
    console.error("Error saving slide:", error);
    return NextResponse.json(
      { error: error.message || "スライドの保存中にエラーが発生しました" },
      { status: 500 }
    );
  }
} 