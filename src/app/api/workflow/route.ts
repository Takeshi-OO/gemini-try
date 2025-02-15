// src/app/api/workflow.ts

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { generateImage } from "@/lib/stability";

import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Geminiモデルの設定
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        slides: {
          type: SchemaType.ARRAY,
          description: "入力された全てのスライドについて、順序通りに処理結果を出力してください。",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              slideNumber: {
                type: SchemaType.INTEGER,
                description: "スライド番号は入力されたスライドの番号と一致する必要があります"
              },
              selectedPhotoFileName: {
                type: SchemaType.STRING,
                description: "選定した写真素材又は元の写真素材のファイル名"
              },
              selectionReason: {
                type: SchemaType.STRING,
                description: "この写真素材を選んだ理由又は現状維持の理由"
              },
              textUpdates: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    originalText: {
                      type: SchemaType.STRING,
                      description: "元のテキスト"
                    },
                    newText: {
                      type: SchemaType.STRING,
                      description: "新しいテキスト"
                    },
                    reason: {
                      type: SchemaType.STRING,
                      description: "このテキストを選んだ理由又は現状維持の理由"
                    }
                  },
                  required: ["originalText", "newText", "reason"]
                }
              },
              decorationPrompt: {
                type: SchemaType.OBJECT,
                properties: {
                  targetFileName: {
                    type: SchemaType.STRING,
                    description: "元の装飾画像のファイル名"
                  },
                  prompt: {
                    type: SchemaType.STRING,
                    description: "英語での装飾画像生成プロンプト又はkeep"
                  },
                  reason: {
                    type: SchemaType.STRING,
                    description: "装飾画像を変更する理由又は現状維持の理由"
                  }
                },
                required: ["targetFileName", "prompt", "reason"]
              },
              updatedSlideData: {
                type: SchemaType.OBJECT,
                description: "ユーザーの要望や写真素材に合致するように元のスライドのJSONの値を更新し、更新した部分のみ出力してください。",
                properties: {
                  slideIndex: {
                    type: SchemaType.INTEGER
                  },
                  width: {
                    type: SchemaType.INTEGER
                  },
                  height: {
                    type: SchemaType.INTEGER
                  },
                  displayDuration: {
                    type: SchemaType.NUMBER
                  },
                  transition: {
                    type: SchemaType.OBJECT,
                    properties: {
                      type: {
                        type: SchemaType.STRING
                      },
                      duration: {
                        type: SchemaType.NUMBER
                      },
                      speed: {
                        type: SchemaType.STRING
                      }
                    }
                  },
                  shapes: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        name: { type: SchemaType.STRING },
                        id: { type: SchemaType.INTEGER },
                        type: { type: SchemaType.STRING },
                        left: { type: SchemaType.NUMBER },
                        top: { type: SchemaType.NUMBER },
                        width: { type: SchemaType.NUMBER },
                        height: { type: SchemaType.NUMBER },
                        rotation: { type: SchemaType.NUMBER },
                        zOrder: { type: SchemaType.INTEGER },
                        fillColor: { type: SchemaType.STRING },
                        fillTransparency: { type: SchemaType.NUMBER },
                        exportedImagePath: { 
                          type: SchemaType.STRING,
                          description: "写真素材又は装飾画像のファイル名",
                          enum: [] // この配列は後で動的に設定します
                        },
                        text: { type: SchemaType.STRING },
                        font: {
                          type: SchemaType.OBJECT,
                          properties: {
                            name: { type: SchemaType.STRING },
                            size: { type: SchemaType.NUMBER },
                            color: { type: SchemaType.STRING }
                          }
                        },
                        textFrameProperties: {
                          type: SchemaType.OBJECT,
                          properties: {
                            alignment: { type: SchemaType.STRING },
                            indentLevel: { type: SchemaType.INTEGER },
                            lineSpacing: { type: SchemaType.NUMBER },
                            marginTop: { type: SchemaType.NUMBER },
                            marginBottom: { type: SchemaType.NUMBER },
                            marginLeft: { type: SchemaType.NUMBER },
                            marginRight: { type: SchemaType.NUMBER }
                          }
                        },
                        groupItems: {
                          type: SchemaType.ARRAY,
                          items: {
                            type: SchemaType.OBJECT,
                            properties: {
                              name: { type: SchemaType.STRING },
                              id: { type: SchemaType.INTEGER },
                              type: { type: SchemaType.STRING },
                              left: { type: SchemaType.NUMBER },
                              top: { type: SchemaType.NUMBER },
                              width: { type: SchemaType.NUMBER },
                              height: { type: SchemaType.NUMBER },
                              rotation: { type: SchemaType.NUMBER },
                              zOrder: { type: SchemaType.INTEGER },
                              fillColor: { type: SchemaType.STRING },
                              fillTransparency: { type: SchemaType.NUMBER },
                              exportedImagePath: { 
                                type: SchemaType.STRING,
                                description: "写真素材又は装飾画像のファイル名",
                                enum: [] // この配列は後で動的に設定します
                              },
                              text: { type: SchemaType.STRING },
                              font: {
                                type: SchemaType.OBJECT,
                                properties: {
                                  name: { type: SchemaType.STRING },
                                  size: { type: SchemaType.NUMBER },
                                  color: { type: SchemaType.STRING }
                                }
                              },
                              textFrameProperties: {
                                type: SchemaType.OBJECT,
                                properties: {
                                  alignment: { type: SchemaType.STRING },
                                  indentLevel: { type: SchemaType.INTEGER },
                                  lineSpacing: { type: SchemaType.NUMBER },
                                  marginTop: { type: SchemaType.NUMBER },
                                  marginBottom: { type: SchemaType.NUMBER },
                                  marginLeft: { type: SchemaType.NUMBER },
                                  marginRight: { type: SchemaType.NUMBER }
                                }
                              }
                            }
                          }
                        }
                      },
                      required: ["id"]
                    }
                  },
                  animations: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        shapeId: { type: SchemaType.INTEGER },
                        effectType: { type: SchemaType.STRING },
                        isExit: { type: SchemaType.INTEGER },
                        triggerType: { type: SchemaType.STRING },
                        duration: { type: SchemaType.NUMBER },
                        delay: { type: SchemaType.NUMBER },
                        accelerate: { type: SchemaType.INTEGER },
                        decelerate: { type: SchemaType.INTEGER },
                        repeatCount: { type: SchemaType.INTEGER },
                        autoReverse: { type: SchemaType.INTEGER }
                      }
                    }
                  }
                }
              }
            },
            required: [
              "slideNumber",
              "selectedPhotoFileName",
              "selectionReason",
              "textUpdates",
              "decorationPrompt",
              "updatedSlideData"
            ]
          }
        }
      },
      required: ["slides"]
    }
  },
});

// デバッグ用の画像分析モデル
const debugImageAnalysisModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        imageAnalysis: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              imageId: {
                type: SchemaType.INTEGER,
                description: "画像のID"
              },
              fileName: {
                type: SchemaType.STRING,
                description: "画像のファイル名"
              },
              description: {
                type: SchemaType.STRING,
                description: "画像の簡潔な説明"
              },
              imageType: {
                type: SchemaType.STRING,
                enum: ["要望画像", "写真素材", "スライド画像"],
                description: "画像の種別"
              } 
            },
            required: ["imageId", "fileName", "description", "imageType"]
          }
        }
      },
      required: ["imageAnalysis"]
    }
  },
});

function replaceDecorationImagePath(slide: any, newDecorImage: string) {
  console.log("\n=== Replacing Decoration Image Path ===");
  console.log("New decoration image:", newDecorImage);
  
  let replacementCount = 0;
  
  // シェイプを再帰的に探す
  function processShape(shape: any) {
    if (
      shape.type !== "Placeholder" &&
      typeof shape.exportedImagePath === "string" &&
      shape.exportedImagePath.length > 0
    ) {
      console.log("Found shape to update:");
      console.log("  Type:", shape.type);
      console.log("  Before:", shape.exportedImagePath);
      shape.exportedImagePath = newDecorImage;
      console.log("  After:", shape.exportedImagePath);
      replacementCount++;
    }

    if (shape.type === "Group" && Array.isArray(shape.groupItems)) {
      shape.groupItems.forEach((child: any) => processShape(child));
    }
  }

  if (Array.isArray(slide.shapes)) {
    slide.shapes.forEach((shape: any) => processShape(shape));
  }
  
  console.log(`Replaced ${replacementCount} image paths`);
}

function replacePlaceholdersWithUserPhoto(
  slide: any, 
  photoInfoList: { photoId: number; fileName: string; photoType: string }[], 
  selectedPhotoFileName: string,
  templateId: string,
  resourcesDir: string
) {

  // スライド内のシェイプを再帰的に探して置き換える
  function processShape(shape: any) {
    // Placeholder要素の場合のみ写真を設定
    if (shape.type === "Placeholder") {
      // 現状維持の場合（selectedPhotoFileNameがuser-で始まらない場合）
      if (!selectedPhotoFileName.startsWith('user-')) {
        // テンプレートから写真をコピー
        const templatePath = path.join(
          process.cwd(),
          "public",
          "templates",
          templateId,
          "resources",
          selectedPhotoFileName
        );
        if (fs.existsSync(templatePath)) {
          const destPath = path.join(
            process.cwd(),
            "public",
            "projects",
            resourcesDir,
            selectedPhotoFileName
          );
          fs.copyFileSync(templatePath, destPath);
          console.log(`Copied photo from ${templatePath} to ${destPath}`);
        }
      }
      
      shape.exportedImagePath = selectedPhotoFileName;
      
      console.log("Updated Placeholder shape:");
      console.log("- Type:", shape.type);
      console.log("- New image path:", shape.exportedImagePath);
    }

    // Groupシェイプの場合、子要素を辿る
    if (shape.type === "Group" && Array.isArray(shape.groupItems)) {
      shape.groupItems.forEach((child: any) => processShape(child));
    }
  }

  // shapes 配列すべてに適用
  if (Array.isArray(slide.shapes)) {
    slide.shapes.forEach((shape: any) => processShape(shape));
  }
}

function extractAllTextsAndImagesFromSlide(slide: any): { texts: string[], images: { path: string, type: string }[] } {
  const result: { texts: string[], images: { path: string, type: string }[] } = {
    texts: [],
    images: []
  };

  function traverseShape(shape: any) {
    if (shape.text) {
      result.texts.push(shape.text);
    }
    if (shape.exportedImagePath) {
      result.images.push({
        path: shape.exportedImagePath,
        type: shape.type || 'unknown'
      });
    }
    if (shape.groupItems && Array.isArray(shape.groupItems)) {
      for (const child of shape.groupItems) {
        traverseShape(child);
      }
    }
  }

  if (slide.shapes && Array.isArray(slide.shapes)) {
    for (const shape of slide.shapes) {
      traverseShape(shape);
    }
  }

  return result;
}

// JSON 形式で GPT から受け取る "カスタマイズプラン" 用の型定義例
type SlidePlan = {
  slideNumber: number;
  baseSlideIndex: number;
  customInstructions: string;
  selectedPhotoId: number;
};


// 画像+ラベル+キャプション+短文 をまとめる型に拡張
type PhotoInfo = {
  photoId: number;    // or photoIndex
  labels: string[];   // タグ一覧
  captions: string[]; // 画像キャプション(複数候補を持たせてもOK)
  dataUrl: string;    // base64 DataURL (後段で使う, GPTには送らない想定)

  // ↓ 追加: GPTで生成した20字以内の短文を保持
  shortText?: string;
};

// タイムスタンプを mmddhhmmss 形式で生成する関数を追加
function getFormattedTimestamp(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${mm}${dd}${hh}${min}${ss}`;
}

async function createOutputDir(): Promise<{ projectDir: string; versionDir: string; resourcesDir: string }> {
  const baseDir = path.join(process.cwd(), "public", "projects");
  
  // projects ディレクトリが存在しない場合は作成
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }
  
  // 既存のprojectフォルダをチェックして次の番号を決定
  const projectDirs = fs.readdirSync(baseDir);
  const projectNumbers = projectDirs
    .filter(dir => dir.startsWith('project'))
    .map(dir => parseInt(dir.replace('project', '')) || 0);
  const nextProjectNumber = projectNumbers.length > 0 ? Math.max(...projectNumbers) + 1 : 1;
  const projectDirName = `project${nextProjectNumber}`;
  const projectDir = path.join(baseDir, projectDirName);

  // プロジェクトディレクトリが存在しない場合は作成
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir);
    // resourcesディレクトリを作成
    fs.mkdirSync(path.join(projectDir, "resources"));
  }

  // バージョンディレクトリを作成
  const versionDir = path.join(projectDir, "version1");
  fs.mkdirSync(versionDir);

  return {
    projectDir: projectDirName,
    versionDir: "version1",
    resourcesDir: path.join(projectDirName, "resources")
  };
}

async function createNextVersionDir(projectDir: string): Promise<{ versionDir: string }> {
  const projectPath = path.join(process.cwd(), "public", "projects", projectDir);
  const versionDirs = fs.readdirSync(projectPath)
    .filter(dir => dir.startsWith('version'))
    .map(dir => parseInt(dir.replace('version', '')) || 0);
  
  const nextVersionNumber = versionDirs.length > 0 ? Math.max(...versionDirs) + 1 : 1;
  const versionDirName = `version${nextVersionNumber}`;
  const versionDir = path.join(projectPath, versionDirName);
  
  fs.mkdirSync(versionDir);
  
  return {
    versionDir: versionDirName
  };
}

async function saveBase64Image(base64Data: string, fileName: string, resourcesDir: string): Promise<string> {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  
  const outputDir = path.join(process.cwd(), "public", "projects", resourcesDir);
  const filePath = path.join(outputDir, fileName);
  
  const imageBuffer = Buffer.from(base64Image, "base64");
  await fs.promises.writeFile(filePath, imageBuffer);
  
  return fileName;
}

// メタデータの型定義を更新
interface OutputMetadata {
  template?: string;
  userPrompt?: string;
  uploadedImages?: string[];
  timestamp?: number;
  projectDir?: string;
  versionDir?: string;
}

// Geminiに画像の内容説明を要求するプロンプト
const imageAnalysisPrompt = `
以下の画像それぞれについて、情報を出力してください。

`;

// コミット情報の型定義を追加
interface Commit {
  id: string;
  parentCommitId?: string;
  stateId: string;
  createdAt: string;
}

// 状態情報の型定義を追加
interface State {
  id: string;
  slides: {
    [slideId: string]: string;
  };
}

// レスポンススキーマの型定義を追加
type ResponseSchema = {
  type: SchemaType;
  properties: {
    slides: {
      type: SchemaType;
      items: {
        type: SchemaType;
        properties: {
          slideNumber: { type: SchemaType };
          selectedPhotoFileName: { 
            type: SchemaType;
            description: string;
            enum?: string[];
          };
          selectionReason: { type: SchemaType; description: string };
          textUpdates: {
            type: SchemaType;
            items: {
              type: SchemaType;
              properties: {
                originalText: { type: SchemaType; description: string };
                newText: { type: SchemaType; description: string };
                reason: { type: SchemaType; description: string };
              };
              required: string[];
            };
          };
          decorationPrompt: {
            type: SchemaType;
            properties: {
              targetFileName: { type: SchemaType; description: string };
              prompt: { type: SchemaType; description: string };
              reason: { type: SchemaType; description: string };
            };
            required: string[];
          };
          updatedSlideData: {
            type: SchemaType;
            description: string;
            properties: {
              shapes: {
                type: SchemaType;
                items: {
                  type: SchemaType;
                  properties: {
                    exportedImagePath: {
                      type: SchemaType;
                      description: string;
                      enum?: string[];
                    };
                    groupItems: {
                      type: SchemaType;
                      items: {
                        type: SchemaType;
                        properties: {
                          exportedImagePath: {
                            type: SchemaType;
                            description: string;
                            enum?: string[];
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
        required: string[];
      };
    };
  };
  required: string[];
};

// スライドの保存関数を修正
async function saveSlide(slide: any, projectDir: string, slideNumber: number): Promise<{ version: string }> {
  const slidesDir = path.join(process.cwd(), "public", "projects", projectDir, "slides", `slide${slideNumber}`);
  
  // バージョンディレクトリを作成
  const versionDirs = fs.existsSync(slidesDir) 
    ? fs.readdirSync(slidesDir).filter(dir => dir.startsWith('version'))
    : [];
  const nextVersionNumber = versionDirs.length > 0 
    ? Math.max(...versionDirs.map(dir => parseInt(dir.replace('version', '')))) + 1 
    : 1;
  const versionDir = `version${nextVersionNumber}`;
  const versionPath = path.join(slidesDir, versionDir);
  
  // ディレクトリ作成
  fs.mkdirSync(versionPath, { recursive: true });
  
  // スライドJSONを保存
  const slideJsonPath = path.join(versionPath, `slide${slideNumber}.json`);
  fs.writeFileSync(slideJsonPath, JSON.stringify(slide, null, 2));
  
  return { version: versionDir };
}

// コミットと状態の保存関数を追加
async function saveCommitAndState(projectDir: string, parentCommitId: string | undefined, slideVersions: { [slideId: string]: string }) {
  const projectPath = path.join(process.cwd(), "public", "projects", projectDir);
  
  // states.jsonを読み込みまたは作成
  const statesPath = path.join(projectPath, "states.json");
  let states: State[] = [];
  if (fs.existsSync(statesPath)) {
    states = JSON.parse(fs.readFileSync(statesPath, 'utf-8'));
  }

  // 前の状態のスライドバージョン情報を取得
  let previousSlideVersions: { [slideId: string]: string } = {};
  if (parentCommitId) {
    const commits = JSON.parse(fs.readFileSync(path.join(projectPath, "commits.json"), 'utf-8'));
    const parentCommit = commits.find((c: Commit) => c.id === parentCommitId);
    if (parentCommit) {
      const parentState = states.find((s: State) => s.id === parentCommit.stateId);
      if (parentState) {
        previousSlideVersions = parentState.slides;
      }
    }
  }
  
  // 新しいスライドバージョン情報を前の状態とマージ
  const mergedSlideVersions = { ...previousSlideVersions, ...slideVersions };
  
  // 新しい状態IDを生成
  const stateId = `state${states.length + 1}`;
  
  // 新しい状態を追加
  states.push({
    id: stateId,
    slides: mergedSlideVersions
  });
  
  // states.jsonを保存
  fs.writeFileSync(statesPath, JSON.stringify(states, null, 2));
  
  // commits.jsonを読み込みまたは作成
  const commitsPath = path.join(projectPath, "commits.json");
  let commits: Commit[] = [];
  if (fs.existsSync(commitsPath)) {
    commits = JSON.parse(fs.readFileSync(commitsPath, 'utf-8'));
  }
  
  // 新しいコミットを追加
  const commitId = `commit${commits.length + 1}`;
  commits.push({
    id: commitId,
    parentCommitId,
    stateId,
    createdAt: new Date().toISOString()
  });
  
  // commits.jsonを保存
  fs.writeFileSync(commitsPath, JSON.stringify(commits, null, 2));
  
  return { commitId, stateId };
}

// ログ管理のための関数を追加
function createLogEntry(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
}

function appendToLogFile(projectDir: string, logEntry: string) {
  const logsDir = path.join(process.cwd(), "public", "projects", projectDir, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const logFileName = `workflow-${new Date().toISOString().split('T')[0]}.log`;
  const logFilePath = path.join(logsDir, logFileName);
  
  fs.appendFileSync(logFilePath, logEntry);
}

// スライドデータを更新する補助関数を追加
function updateSlideDataWithChanges(baseSlideData: any, updatedData: any) {
  // ベースとなるスライドデータのディープコピーを作成
  const newSlideData = JSON.parse(JSON.stringify(baseSlideData));

  // オブジェクトの深いマージを行う補助関数
  function deepMerge(target: any, source: any) {
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        target[key] = deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  // 基本的なプロパティの更新
  const basicProps = ['slideIndex', 'width', 'height', 'displayDuration'];
  basicProps.forEach(prop => {
    if (updatedData[prop] !== undefined) {
      newSlideData[prop] = updatedData[prop];
    }
  });

  // トランジションの更新
  if (updatedData.transition) {
    newSlideData.transition = deepMerge(newSlideData.transition || {}, updatedData.transition);
  }

  // shapesの更新（IDに基づいて更新）
  if (updatedData.shapes && Array.isArray(updatedData.shapes)) {
    updatedData.shapes.forEach((updatedShape: any) => {
      const targetShapeIndex = newSlideData.shapes.findIndex((s: any) => s.id === updatedShape.id);
      if (targetShapeIndex !== -1) {
        // 既存のshapeと更新データを深いマージ
        newSlideData.shapes[targetShapeIndex] = deepMerge(
          { ...newSlideData.shapes[targetShapeIndex] },
          updatedShape
        );

        // groupItemsが存在する場合は再帰的に更新
        if (updatedShape.groupItems && Array.isArray(updatedShape.groupItems)) {
          if (!newSlideData.shapes[targetShapeIndex].groupItems) {
            newSlideData.shapes[targetShapeIndex].groupItems = [];
          }
          updatedShape.groupItems.forEach((updatedGroupItem: any) => {
            const targetGroupItemIndex = newSlideData.shapes[targetShapeIndex].groupItems.findIndex((g: any) => g.id === updatedGroupItem.id);
            if (targetGroupItemIndex !== -1) {
              newSlideData.shapes[targetShapeIndex].groupItems[targetGroupItemIndex] = deepMerge(
                { ...newSlideData.shapes[targetShapeIndex].groupItems[targetGroupItemIndex] },
                updatedGroupItem
              );
            }
          });
        }
      }
    });
  }

  // アニメーションの更新
  if (updatedData.animations && Array.isArray(updatedData.animations)) {
    if (!newSlideData.animations) {
      newSlideData.animations = [];
    }
    updatedData.animations.forEach((updatedAnimation: any) => {
      const targetAnimationIndex = newSlideData.animations.findIndex((a: any) => a.shapeId === updatedAnimation.shapeId);
      if (targetAnimationIndex !== -1) {
        newSlideData.animations[targetAnimationIndex] = deepMerge(
          { ...newSlideData.animations[targetAnimationIndex] },
          updatedAnimation
        );
      } else {
        newSlideData.animations.push(updatedAnimation);
      }
    });
  }

  return newSlideData;
}

export async function POST(request: Request) {
  console.log("\n=== Workflow Start ===");
  try {
    // 1. FormDataの取得
    console.log("\n--- Step 1: Getting Form Data ---");
    const formData = await request.formData();
    const photos = formData.getAll("photos") as File[];
    const photoTypes = formData.getAll("photoTypes") as string[];
    const customizationPrompt = formData.get("customizationPrompt") as string;
    const selectedSampleVideoId = formData.get("selectedSampleVideoId") as string;
    const templateId = formData.get("templateId") as string || "template1";
    const previousProjectDir = formData.get("previousProjectDir") as string;
    const previousVersionDir = formData.get("previousVersionDir") as string;
    
    console.log("Template ID:", templateId);
    console.log("Number of photos:", photos.length);
    console.log("Previous project:", previousProjectDir);

    // ログエントリーの作成と保存
    let currentProjectDir: string;

    // 出力ディレクトリを作成
    console.log("\n--- Step 2: Creating Output Directory ---");
    let projectDir: string;
    let versionDir: string;
    let resourcesDir: string;

    if (previousProjectDir && previousVersionDir) {
      console.log("Creating new version in existing project");
      projectDir = previousProjectDir;
      const { versionDir: newVersionDir } = await createNextVersionDir(projectDir);
      versionDir = newVersionDir;
      resourcesDir = path.join(projectDir, "resources");
      
      // ログを記録
      const logEntry = createLogEntry("Workflow started with existing project", {
        projectDir,
        versionDir,
        templateId,
        photosCount: photos.length,
        customizationPrompt
      });
      appendToLogFile(projectDir, logEntry);
    } else {
      console.log("Creating new project");
      const result = await createOutputDir();
      projectDir = result.projectDir;
      versionDir = result.versionDir;
      resourcesDir = result.resourcesDir;
      
      // ログを記録
      const logEntry = createLogEntry("Workflow started with new project", {
        projectDir,
        versionDir,
        templateId,
        photosCount: photos.length,
        customizationPrompt
      });
      appendToLogFile(projectDir, logEntry);
    }

    const projectPath = path.join(process.cwd(), "public", "projects", projectDir);
    console.log("Project directory:", projectPath);

    // タイプごとのカウンターを初期化
    console.log("\n--- Step 3: Saving Photos and Creating Available Filenames List ---");
    let materialCounter = 1;
    let requestCounter = 1;

    // アップロードされた画像を保存
    const savedPhotos = await Promise.all(photos.map(async (photo, index) => {
      console.log(`Processing photo ${index + 1}/${photos.length}`);
      
      // ファイルサイズが0の場合は既存の写真と判断
      if (photo.size === 0) {
        const fileName = photo.name;
        console.log(`Reusing existing photo: ${fileName}`);
        return {
          photoId: index + 1,
          fileName: fileName,
          type: photo.type,
          photoType: photoTypes[index] || "material"
        };
      }

      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const timestamp = getFormattedTimestamp();
      const photoType = photoTypes[index] || "material";
      const prefix = photoType === "material" ? "user" : "req";
      // タイプに応じたカウンターを使用
      const counter = photoType === "material" ? materialCounter++ : requestCounter++;
      const fileName = `${prefix}-${timestamp}-${counter}.${photo.type.split('/')[1]}`;
      const filePath = path.join(projectPath, "resources", fileName);
      await fs.promises.writeFile(filePath, buffer);
      return {
        photoId: index + 1,
        fileName: fileName,
        type: photo.type,
        photoType: photoType
      };
    }));

    // 使用可能なファイル名リストを作成
    const availableFileNames = savedPhotos
      .filter(photo => photo.fileName.startsWith('user-'))
      .map(photo => photo.fileName);

    // テンプレートの装飾画像をリストに追加（一時的にコメントアウト）
    const templateResourcesPath = path.join(process.cwd(), "public", "templates", templateId, "resources");
    // if (fs.existsSync(templateResourcesPath)) {
    //   const templateFiles = fs.readdirSync(templateResourcesPath);
    //   availableFileNames.push(...templateFiles);
    // }

    // レスポンススキーマのenumを動的に設定
    const schema = model.generationConfig.responseSchema as ResponseSchema;
    if (schema?.properties?.slides?.items?.properties?.updatedSlideData?.properties?.shapes?.items?.properties?.exportedImagePath) {
      schema.properties.slides.items.properties.updatedSlideData.properties.shapes.items.properties.exportedImagePath.enum = availableFileNames;
    }
    if (schema?.properties?.slides?.items?.properties?.updatedSlideData?.properties?.shapes?.items?.properties?.groupItems?.items?.properties?.exportedImagePath) {
      schema.properties.slides.items.properties.updatedSlideData.properties.shapes.items.properties.groupItems.items.properties.exportedImagePath.enum = availableFileNames;
    }
    if (schema?.properties?.slides?.items?.properties?.selectedPhotoFileName) {
      schema.properties.slides.items.properties.selectedPhotoFileName.enum = availableFileNames;
    }

    // レスポンススキーマの設定内容をログに出力
    appendToLogFile(projectDir, createLogEntry("Response Schema Configuration", {
      availableFileNames,
      responseSchema: {
        allowedImagePaths: availableFileNames,
        fullSchema: JSON.stringify(schema, null, 2)
      }
    }));

    // メタデータを保存
    console.log("\n--- Step 4: Saving Metadata ---");
    const metadata = {
      template: templateId,
      userPrompt: customizationPrompt,
      uploadedImages: savedPhotos.map(photo => photo.fileName),
      timestamp: Date.now(),
      projectDir,
      versionDir
    };

    const metadataPath = path.join(projectPath, versionDir, "metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log("Metadata saved successfully");

    // 2. スライドJSONを読み込み
    console.log("\n--- Step 5: Loading Slides JSON ---");
    let slidesJsonPath: string;
    let processedSlides: any[] = [];  // 変数名を変更

    if (previousProjectDir && previousVersionDir) {
      console.log("Loading slides from previous version");
      const commitsPath = path.join(
        process.cwd(),
        "public",
        "projects",
        previousProjectDir,
        "commits.json"
      );
      const statesPath = path.join(
        process.cwd(),
        "public",
        "projects",
        previousProjectDir,
        "states.json"
      );

      console.log("Reading commits and states files");
      // BOMを除去してJSONを読み込む
      const rawCommitsJson = fs.readFileSync(commitsPath, "utf-8").replace(/^\uFEFF/, '');
      const rawStatesJson = fs.readFileSync(statesPath, "utf-8").replace(/^\uFEFF/, '');

      try {
        console.log("Parsing commits and states");
        const commits = JSON.parse(rawCommitsJson);
        const states = JSON.parse(rawStatesJson);
        
        console.log("Getting latest commit and state");
        const latestCommit = commits[commits.length - 1];
        const currentState = states.find((s: any) => s.id === latestCommit.stateId);

        if (!currentState) {
          console.error("State not found");
          throw new Error(`State ${latestCommit.stateId} not found`);
        }

        console.log("Loading individual slides");
        // 各スライドを読み込んで結合
        const slides = await Promise.all(
          Object.entries(currentState.slides).map(async ([slideId, version]) => {
            console.log(`Loading slide: ${slideId}, version: ${version}`);
            const slideJsonPath = path.join(
              process.cwd(),
              "public",
              "projects",
              previousProjectDir,
              "slides",
              slideId,
              version as string,
              `${slideId}.json`
            );
            const rawJsonWithBom = fs.readFileSync(slideJsonPath, "utf-8");
            const rawJson = rawJsonWithBom.replace(/^\uFEFF/, "");
            return JSON.parse(rawJson);
          })
        );

        console.log("Sorting slides");
        // スライドを順番に並べ替え
        const sortedSlides = slides.sort((a, b) => {
          const indexA = a.slideIndex ?? 0;
          const indexB = b.slideIndex ?? 0;
          return indexA - indexB;
        });

        console.log("Creating template data");
        processedSlides = sortedSlides;
      } catch (error: any) {
        console.error("Error reading slides from previous version:", error);
        throw error;
      }
    } else {
      console.log("Loading slides from template");
      const commitsPath = path.join(
        process.cwd(),
        "public",
        "templates",
        templateId,
        "commits.json"
      );
      const statesPath = path.join(
        process.cwd(),
        "public",
        "templates",
        templateId,
        "states.json"
      );

      console.log("Reading commits and states files");
      // BOMを除去してJSONを読み込む
      const rawCommitsJson = fs.readFileSync(commitsPath, "utf-8").replace(/^\uFEFF/, '');
      const rawStatesJson = fs.readFileSync(statesPath, "utf-8").replace(/^\uFEFF/, '');

      try {
        console.log("Parsing commits and states");
        const commits = JSON.parse(rawCommitsJson);
        const states = JSON.parse(rawStatesJson);
        
        console.log("Getting latest commit and state");
        const latestCommit = commits[commits.length - 1];
        const currentState = states.find((s: any) => s.id === latestCommit.stateId);

        if (!currentState) {
          console.error("State not found");
          throw new Error(`State ${latestCommit.stateId} not found`);
        }

        console.log("Loading individual slides");
        // 各スライドを読み込んで結合
        const slides = await Promise.all(
          Object.entries(currentState.slides).map(async ([slideId, version]) => {
            console.log(`Loading slide: ${slideId}, version: ${version}`);
            const slideJsonPath = path.join(
              process.cwd(),
              "public",
              "templates",
              templateId,
              "slides",
              slideId,
              version as string,
              `${slideId}.json`
            );
            const rawJsonWithBom = fs.readFileSync(slideJsonPath, "utf-8");
            const rawJson = rawJsonWithBom.replace(/^\uFEFF/, "");
            return JSON.parse(rawJson);
          })
        );

        console.log("Sorting slides");
        // スライドを順番に並べ替え
        const sortedSlides = slides.sort((a, b) => {
          const indexA = a.slideIndex ?? 0;
          const indexB = b.slideIndex ?? 0;
          return indexA - indexB;
        });

        console.log("Creating template data");
        processedSlides = sortedSlides;
      } catch (error: any) {
        console.error("Error reading slides from template:", error);
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }
    }

    // 3. Geminiに入力するためのコンテキストを準備
    console.log("\n--- Step 6: Preparing Gemini Context ---");
    const slideMappings = processedSlides.map((slide: any) => ({
      slideIndex: slide.slideIndex,
      slideData: slide  // スライドの完全なデータを含める
    }));

    console.log("=== Gemini API Input Preparation ===");
    console.log("Number of slides:", slideMappings.length);
    console.log("Number of photos:", savedPhotos.length);

    // 4. Geminiでスライドのカスタマイズを実行
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

    // ログを記録
    appendToLogFile(projectDir, createLogEntry("Starting Gemini API processing"));

    const imageParts = await Promise.all(savedPhotos.map(async (photo) => {
      const filePath = path.join(projectPath, "resources", photo.fileName);
      // ファイルアップロードを実施
      const uploadResult = await fileManager.uploadFile(filePath, { mimeType: photo.type });

      // ファイル処理状況を確認
      let file = await fileManager.getFile(uploadResult.file.name);
      while (file.state === FileState.PROCESSING) {
        console.log(`Waiting for processing of ${photo.fileName}...`);
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        file = await fileManager.getFile(uploadResult.file.name);
      }
      if (file.state === FileState.FAILED) {
        throw new Error(`File processing failed for ${photo.fileName}`);
      }
      
      return {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: photo.type
        }
      };
    }));

    // ログを記録
    appendToLogFile(projectDir, createLogEntry("Image parts processed", { count: imageParts.length }));

    // テンプレートのスライド画像を読み込む
    let templateImageFiles: string[] = [];
    let templateImageParts: any[] = [];

    if (previousProjectDir && previousVersionDir) {
      // 前回のバージョンのスライド画像を読み込む
      const previousVisualDir = path.join(process.cwd(), "public", "projects", previousProjectDir, previousVersionDir, "visual");
      if (fs.existsSync(previousVisualDir)) {
        templateImageFiles = fs.readdirSync(previousVisualDir)
          .filter(file => file.toLowerCase().endsWith('.png'));
        
        templateImageParts = await Promise.all(templateImageFiles.map(async (fileName) => {
          const filePath = path.join(previousVisualDir, fileName);
          // File APIを使用してアップロード
          const uploadResult = await fileManager.uploadFile(filePath, { mimeType: 'image/png' });

          // ファイル処理状況を確認
          let file = await fileManager.getFile(uploadResult.file.name);
          while (file.state === FileState.PROCESSING) {
            console.log(`Waiting for processing of template image ${fileName}...`);
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            file = await fileManager.getFile(uploadResult.file.name);
          }
          if (file.state === FileState.FAILED) {
            throw new Error(`File processing failed for template image ${fileName}`);
          }

          return {
            fileData: {
              fileUri: uploadResult.file.uri,
              mimeType: 'image/png'
            }
          };
        }));
      }
    } else {
      // 新規の場合は各スライドディレクトリから画像を読み込む
      console.log("Loading template images from slide directories");
      const templateBasePath = path.join(process.cwd(), "public", "templates", templateId, "slides");
      
      // スライド画像のパスを先に収集
      const slideImagePaths = processedSlides
        .map(slide => {
          const slideNumber = slide.slideIndex;
          const slideDir = path.join(templateBasePath, `slide${slideNumber}`, "version1");
          const slideImagePath = path.join(slideDir, `slide${slideNumber}.png`);
          return fs.existsSync(slideImagePath) ? {
            path: slideImagePath,
            fileName: `slide${slideNumber}.png`
          } : null;
        })
        .filter(item => item !== null);

      // 並列でアップロード
      templateImageParts = await Promise.all(
        slideImagePaths.map(async (item) => {
          if (!item) return null;
          console.log(`Uploading template image: ${item.fileName}`);
          
          const uploadResult = await fileManager.uploadFile(item.path, { mimeType: 'image/png' });
          let file = await fileManager.getFile(uploadResult.file.name);
          
          while (file.state === FileState.PROCESSING) {
            console.log(`Waiting for processing of template image ${item.fileName}...`);
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            file = await fileManager.getFile(uploadResult.file.name);
          }
          
          if (file.state === FileState.FAILED) {
            throw new Error(`File processing failed for template image ${item.fileName}`);
          }

          templateImageFiles.push(item.fileName);
          return {
            fileData: {
              fileUri: uploadResult.file.uri,
              mimeType: 'image/png'
            }
          };
        })
      );

      templateImageParts = templateImageParts.filter(part => part !== null);
    }

    console.log(`Loaded ${templateImageFiles.length} template images`);

    const promptText = `
        [あなたの役割:
        あなたは結婚式で上映するスライドショーのjsonを日本の結婚式様式に合わせたスライドショーになるようにカスタマイズするアプリです。
        ]

        [重要な制約事項:
        - 入力された${processedSlides.length}枚のスライドについて、必ず1回ずつ、順序通りに処理してください
        - スライドの処理を省略したり、重複して処理したりしないでください
        - スライドの処理順序を変更しないでください
        - 必ず${processedSlides.length}枚分の処理結果を出力してください
        ]

        [指示：
        以下の操作をしてください。
        - ユーザーが要望を入力した場合は、その要望に合致するように元のスライドのJSONの色や位置などの値を更新し、更新した部分のみをupdatedSlideDataに出力してください。
        - ユーザーが要望を入力した場合は、基本的にはその要望に合うように装飾画像の変更をstablityAIに指示する英語のプロンプトを作成し、decorationPromptに記載してください。ただし、明らかに装飾画像と無関係な要望である場合にのみ、"keep"と出力してください。stablityAIへは元の装飾画像以外の画像を入力しないため、それ以外の画像の情報は言語化して言葉で伝えてください。
        - ユーザーが写真素材を入力した場合は、元のスライドの写真素材位置に最適な写真素材を選定しselectedPhotoFileNameに入力してください。またそのスライドの全てのテキストをoriginalTextに出力し、選定した写真素材とそのスライドの雰囲気を考慮して最も適した新しいテキストをnewtextに出力してください。そして、選定した理由又は現状維持の理由をselectionReasonに出力してください。 
        - ユーザーが写真素材を入力しなかった場合は、元の写真素材のファイル名をselectedPhotoFileNameに入力してください。
        - textUpdates、 selectedPhotoFileNameにより新しいテキストやファイル名を選択した場合は、それらをupdatedSlideDataのtext, exportedImagePathに出力してください。
        - ユーザーが特定のスライドの特定の部分の変更のみを指示した場合は、指示された部分のみを更新し、他は現状を維持してください
        ]

        [ユーザーの要望:
        ${customizationPrompt}
        ]

        [元のスライドのJSON:
        ${JSON.stringify(slideMappings, null, 2)}
        - ただし、type が "Placeholder" の場合は写真素材、それ以外の場合は装飾画像として扱ってください
        ]


        [あなたに入力される画像の種類と利用目的:
        - 要望参考画像は、ユーザーの要望の理解するために利用してください。
        - 写真素材は、元のスライドの写真素材を差し替えるために利用してください。
        - 元のスライドの画像は、配置や装飾画像の内容を理解することで、元のスライドのJSONの理解を補助するために利用してください。
        ]
        

    `;

    console.log("Prompt token estimation:", promptText.length / 4); // 概算トークン数
    console.log("promptText:", promptText); 

    try {
      // 共通で使用する変数を先に計算
      const requestPhotosCount = savedPhotos.filter(p => p.photoType === "request").length;

      // 共通のプロンプトパーツを作成
      const commonParts: any[] = [];

      // 要望参考画像を追加
      savedPhotos.filter(p => p.photoType === "request").forEach((photo, index) => {
        commonParts.push(`[要望参考画像: ${photo.fileName}]`);
        commonParts.push(imageParts[savedPhotos.findIndex(p => p.fileName === photo.fileName)]);
      });

      // 写真素材を追加
      savedPhotos.filter(p => p.photoType === "material").forEach((photo, index) => {
        commonParts.push(`[写真素材: ${photo.fileName}]`);
        commonParts.push(imageParts[savedPhotos.findIndex(p => p.fileName === photo.fileName)]);
      });

      // テンプレート画像を追加
      templateImageFiles.forEach((fileName, index) => {
        commonParts.push(`[元のスライドの画像: ${fileName}]`);
        commonParts.push(templateImageParts[index]);
      });

      // 画像分析の実行
      console.log("\n=== Analyzing Images ===");
      const imageAnalysisPromptParts = [imageAnalysisPrompt, ...commonParts];
      const imageAnalysisResult = await debugImageAnalysisModel.generateContent(imageAnalysisPromptParts);
      const imageAnalysisResponse = await imageAnalysisResult.response;
      const imageAnalysisText = imageAnalysisResponse.text();
      
      // デバッグ情報をログに記録
      appendToLogFile(projectDir, createLogEntry("Image Analysis Debug Info", {
        promptTokenEstimate: imageAnalysisPrompt.length / 4,
        totalPartsCount: imageAnalysisPromptParts.length,
        rawResponse: imageAnalysisText,
        cleanedResponse: imageAnalysisText.replace(/```json\n|\n```/g, '')
      }));

      const cleanedImageAnalysis = imageAnalysisText.replace(/```json\n|\n```/g, '');
      const imageAnalysis = JSON.parse(cleanedImageAnalysis);
      
      console.log("Image analysis completed:", JSON.stringify(imageAnalysis, null, 2));

      // メインのプロンプトを作成
      const promptParts = [promptText, ...commonParts];
      const prompt = model.generateContent(promptParts);
      const result = await prompt;
      console.log("Gemini API call successful");
      
      const response = await result.response;
      const rawResponse = response.text();
      
      // デバッグ情報をログに記録
      appendToLogFile(projectDir, createLogEntry("Main Gemini API Debug Info", {
        promptTokenEstimate: promptText.length / 4,
        totalPartsCount: promptParts.length,
        rawResponse: rawResponse,
        cleanedResponse: rawResponse.replace(/```json\n|\n```/g, '')
      }));
      
      // マークダウン記法を削除してJSONをパース
      const cleanedResponse = rawResponse.replace(/```json\n|\n```/g, '');
      
      try {
        const customizationPlan = JSON.parse(cleanedResponse);
        console.log("Parsed customization plan:", JSON.stringify(customizationPlan, null, 2));
        
        // レスポンスの検証
        validateGeminiResponse(customizationPlan, processedSlides);
        
        // ログを記録
        appendToLogFile(projectDir, createLogEntry("Customization plan received and validated", customizationPlan));

        if (!customizationPlan.slides || !Array.isArray(customizationPlan.slides)) {
          throw new Error("Invalid response format from Gemini API: missing or invalid slides array");
        }

        // 選択理由をログに出力
        console.log("=== Photo Selection Reasons ===");
        customizationPlan.slides.forEach((slide: any) => {
          console.log(`Slide ${slide.slideNumber}: ${slide.selectionReason}`);
        });

        // Server-Sent Events用のストリームを作成
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              // 前回のコミットIDを取得
              let previousCommitId: string | undefined;
              if (previousProjectDir) {
                const commitsPath = path.join(process.cwd(), "public", "projects", previousProjectDir, "commits.json");
                if (fs.existsSync(commitsPath)) {
                  const commits = JSON.parse(fs.readFileSync(commitsPath, 'utf-8'));
                  previousCommitId = commits[commits.length - 1].id;
                }
              }

              // スライドの処理部分を修正
              const slideVersions: { [slideId: string]: string } = {};
              const resultSlides: any[] = [];  // 処理結果を保存する配列

              console.log("\n=== Processing Slides ===");
              console.log("Number of slides to process:", customizationPlan.slides.length);
              console.log("Number of base slides available:", processedSlides.length);

              for (const slidePlan of customizationPlan.slides) {
                const { slideNumber, selectedPhotoFileName, decorationPrompt } = slidePlan;
                
                // ログを記録
                appendToLogFile(projectDir, createLogEntry(`Processing slide ${slideNumber}`, {
                  selectedPhotoFileName,
                  hasDecorationPrompt: !!decorationPrompt
                }));

                //=== Finding Base Slide ===

                const baseSlideData = processedSlides.find((s:any) => s.slideIndex === Number(slideNumber));
                if (!baseSlideData) {
                  console.log(`Base slide not found for slideNumber: ${slideNumber}`);
                  console.log("Available slide indices:", processedSlides.map(s => s.slideIndex));
                  continue;
                }

                console.log("Found base slide with index:", baseSlideData.slideIndex);

                // Deep clone the slide data to preserve original structure
                const newSlideData = JSON.parse(JSON.stringify(baseSlideData));

                console.log(`\n=== Processing Slide ${slideNumber} ===`);
                console.log("Selected Photo Filename:", selectedPhotoFileName);
                console.log("Decoration Prompt:", decorationPrompt);

                // updatedSlideDataの適用
                if (slidePlan.updatedSlideData) {
                  console.log("\n--- Applying Updated Slide Data ---");
                  const updatedSlideData = updateSlideDataWithChanges(newSlideData, slidePlan.updatedSlideData);
                  Object.assign(newSlideData, updatedSlideData);
                  console.log("Slide data updated successfully");
                }

                // 写真の置き換えと保存
                const photoInfo = savedPhotos.map(photo => ({
                  photoId: photo.photoId,
                  fileName: photo.fileName,
                  photoType: photo.photoType
                }));

                // 写真の置き換え
                console.log("\n--- Replacing User Photos ---");
                replacePlaceholdersWithUserPhoto(
                  newSlideData,
                  photoInfo,
                  selectedPhotoFileName,
                  templateId,
                  resourcesDir
                );

                // 装飾画像の処理
                if (slidePlan.decorationPrompt && typeof slidePlan.decorationPrompt === 'object') {
                  appendToLogFile(projectDir, createLogEntry("Processing decoration images", slidePlan.decorationPrompt));
                  try {
                    if (slidePlan.decorationPrompt.prompt === "keep") {
                      console.log("Keeping original decoration image as requested");
                      // 元の装飾画像をリソースディレクトリにコピー
                      const decorElements = findDecorationElements(newSlideData);
                      for (const elem of decorElements) {
                        if (elem.exportedImagePath && !elem.exportedImagePath.startsWith('user-')) {
                          const decorImageName = path.basename(elem.exportedImagePath);
                          // テンプレートから装飾画像をコピー
                          const templatePath = path.join(
                            process.cwd(),
                            "public",
                            "templates",
                            templateId,
                            "resources",
                            decorImageName
                          );
                          if (fs.existsSync(templatePath)) {
                            const destPath = path.join(
                              process.cwd(),
                              "public",
                              "projects",
                              resourcesDir,
                              decorImageName
                            );
                            fs.copyFileSync(templatePath, destPath);
                            console.log(`Copied decoration image from ${templatePath} to ${destPath}`);
                          }
                        }
                      }
                    } else if (slidePlan.decorationPrompt.prompt !== "null") {
                      await processDecorationElements(newSlideData, templateId, slidePlan.decorationPrompt.prompt, resourcesDir);
                      console.log("Decoration image processing completed successfully");
                    }
                  } catch (error) {
                    console.error("Error processing decoration images:", error);
                  }
                } else {
                  console.log("No valid decoration prompt provided for this slide");
                }

                // 画像の保存処理（Base64をファイルとして保存）
                console.log("\n--- Saving Slide Images ---");
                const processedShapes = await saveSlideImages(newSlideData, resourcesDir);
                newSlideData.shapes = processedShapes;
                console.log("Slide images saved successfully");

                // テキストの更新
                if (slidePlan.textUpdates && Array.isArray(slidePlan.textUpdates)) {
                  console.log("\n--- Updating Slide Text ---");
                  updateSlideText(newSlideData, slidePlan.textUpdates);
                  console.log("Text updated successfully");
                }

                // 各スライドを個別に保存
                const { version } = await saveSlide(newSlideData, projectDir, slidePlan.slideNumber);
                slideVersions[`slide${slidePlan.slideNumber}`] = version;
                resultSlides.push(newSlideData);

                // 進捗をストリーミング
                const progressResponse = {
                  success: true,
                  slides: resultSlides,
                  projectDir,
                  slideVersions,
                  isComplete: resultSlides.length === customizationPlan.slides.length,
                  currentSlideIndex: resultSlides.length,
                  imageAnalysis: imageAnalysis.imageAnalysis
                };

                // JSONデータのログを記録
                appendToLogFile(projectDir, createLogEntry("Sending SSE data", {
                  currentSlideNumber: slideNumber,
                  totalSlides: customizationPlan.slides.length,
                  currentSlideIndex: resultSlides.length,
                  isComplete: resultSlides.length === customizationPlan.slides.length
                }));

                try {
                  // 送信前にJSONの検証を行う
                  JSON.parse(JSON.stringify(progressResponse));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressResponse)}\n\n`));
                } catch (error: any) {
                  // JSONエラーをログに記録
                  appendToLogFile(projectDir, createLogEntry("JSON stringify/parse error", {
                    error: error.message,
                    stack: error.stack,
                    problematicData: progressResponse
                  }));
                  throw error;
                }
              }
              
              // Geminiが回答しなかったスライドも保存
              for (const baseSlide of processedSlides) {
                // すでに処理済みのスライドはスキップ
                if (customizationPlan.slides.some((plan: { slideNumber: number }) => plan.slideNumber === baseSlide.slideIndex)) {
                  continue;
                }

                console.log(`\n=== Processing Unchanged Slide ${baseSlide.slideIndex} ===`);

                // Deep clone the slide data
                const newSlideData = JSON.parse(JSON.stringify(baseSlide));

                // 写真素材をリソースディレクトリにコピー
                function copyPlaceholderImages(shape: any) {
                  if (shape.type === "Placeholder" && shape.exportedImagePath) {
                    const imageName = path.basename(shape.exportedImagePath);
                    const templatePath = path.join(
                      process.cwd(),
                      "public",
                      "templates",
                      templateId,
                      "resources",
                      imageName
                    );
                    if (fs.existsSync(templatePath)) {
                      const destPath = path.join(
                        process.cwd(),
                        "public",
                        "projects",
                        resourcesDir,
                        imageName
                      );
                      fs.copyFileSync(templatePath, destPath);
                      console.log(`Copied photo from ${templatePath} to ${destPath}`);
                    }
                  }
                  if (shape.groupItems && Array.isArray(shape.groupItems)) {
                    shape.groupItems.forEach((item: any) => copyPlaceholderImages(item));
                  }
                }

                if (newSlideData.shapes && Array.isArray(newSlideData.shapes)) {
                  newSlideData.shapes.forEach((shape: any) => copyPlaceholderImages(shape));
                }

                // テンプレートの装飾画像をリソースディレクトリにコピー
                const decorElements = findDecorationElements(newSlideData);
                for (const elem of decorElements) {
                  if (elem.exportedImagePath && !elem.exportedImagePath.startsWith('user-')) {
                    const decorImageName = path.basename(elem.exportedImagePath);
                    const templatePath = path.join(
                      process.cwd(),
                      "public",
                      "templates",
                      templateId,
                      "resources",
                      decorImageName
                    );
                    if (fs.existsSync(templatePath)) {
                      const destPath = path.join(
                        process.cwd(),
                        "public",
                        "projects",
                        resourcesDir,
                        decorImageName
                      );
                      fs.copyFileSync(templatePath, destPath);
                      console.log(`Copied decoration image from ${templatePath} to ${destPath}`);
                    }
                  }
                }

                // スライドを保存
                const { version } = await saveSlide(newSlideData, projectDir, baseSlide.slideIndex);
                slideVersions[`slide${baseSlide.slideIndex}`] = version;
                resultSlides.push(newSlideData);

                // 進捗をストリーミング
                const progressResponse = {
                  success: true,
                  slides: resultSlides,
                  projectDir,
                  slideVersions,
                  isComplete: resultSlides.length === processedSlides.length,
                  currentSlideIndex: resultSlides.length,
                  imageAnalysis: imageAnalysis.imageAnalysis
                };

                controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressResponse)}\n\n`));
              }

              // コミットと状態を保存
              const { commitId, stateId } = await saveCommitAndState(projectDir, previousCommitId, slideVersions);

              // 最終ログを記録
              appendToLogFile(projectDir, createLogEntry("Workflow completed successfully", {
                commitId,
                stateId,
                processedSlideCount: customizationPlan.slides.length
              }));

              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });

      } catch (error: any) {
        // エラーログを記録
        appendToLogFile(projectDir, createLogEntry("Error in workflow", {
          error: error.message,
          stack: error.stack
        }));
        console.error("=== Gemini API Error ===");
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Error details:", {
          name: error.name,
          status: error.status,
          statusText: error.statusText,
          errorDetails: error.errorDetails
        });
        throw error;
      }

    } catch (error: any) {
      console.error("Workflow error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Workflow error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// スライドのテキストを更新する補助関数を修正
function updateSlideText(slide: any, textUpdates: { originalText: string; newText: string }[]) {
  function traverseShape(shape: any) {
    if (shape.text) {
      // 元のテキストと一致するアップデートを探す
      const update = textUpdates.find(u => u.originalText === shape.text);
      if (update) {
        shape.text = update.newText;
      }
    }
    if (shape.groupItems && Array.isArray(shape.groupItems)) {
      shape.groupItems.forEach((item: any) => traverseShape(item));
    }
  }

  if (slide.shapes && Array.isArray(slide.shapes)) {
    slide.shapes.forEach((shape: any) => traverseShape(shape));
  }
}

// 装飾要素を処理する関数を修正
async function processDecorationElements(slide: any, templateId: string, decorationPrompt: string, resourcesDir: string) {
  const decorElements = findDecorationElements(slide);
  console.log(`\n=== Processing ${decorElements.length} Decoration Elements ===`);

  for (const elem of decorElements) {
    if (elem.exportedImagePath) {
      console.log("\n--- Processing Decoration Element ---");
      console.log("Element type:", elem.type);
      console.log("Original image path:", elem.exportedImagePath);
      
      // ユーザー画像の場合はスキップ
      if (elem.exportedImagePath.startsWith('user-')) {
        console.log("Skipping user image");
        continue;
      }

      // 装飾画像のファイル名を抽出
      const decorImageName = path.basename(elem.exportedImagePath);
      console.log("Decoration image name:", decorImageName);

      // まず前回生成したプロジェクトのリソースディレクトリを確認
      let decorImagePath = path.join(
        process.cwd(),
        "public",
        "projects",
        resourcesDir,
        decorImageName
      );

      // 前回の装飾画像が見つからない場合はテンプレートを確認
      if (!fs.existsSync(decorImagePath)) {
        decorImagePath = path.join(
          process.cwd(),
          "public",
          "templates",
          templateId,
          "resources",
          decorImageName
        );
      }
      
      console.log("Decoration image full path:", decorImagePath);
      
      if (fs.existsSync(decorImagePath)) {
        console.log("Decoration image found");
        
        try {
          const decorImageBuffer = fs.readFileSync(decorImagePath);
          const decorImageBase64 = decorImageBuffer.toString("base64");
          const decorImageDataUrl = `data:image/png;base64,${decorImageBase64}`;
          
          console.log("\n--- Calling Stability AI API ---");
          console.log("Original decoration image:", decorImageName);
          console.log("Decoration prompt:", decorationPrompt);

          // タイムスタンプを含む新しいファイル名を生成
          const timestamp = getFormattedTimestamp();
          const newFileName = `deco-${timestamp}.png`;
          
          // generateImage関数にファイル名を渡す
          const newDecorImageFileName = await generateImage({
            prompt: decorationPrompt,
            initImage: decorImageDataUrl,
            outputFileName: newFileName
          }, resourcesDir);
          
          console.log("Stability AI API call successful");
          console.log("Generated image filename:", newDecorImageFileName);
          
          // 新しい画像のフルパスを確認
          const newImagePath = path.join(process.cwd(), "public", "projects", resourcesDir, newDecorImageFileName);
          console.log("New image path:", newImagePath);
          console.log("New image exists:", fs.existsSync(newImagePath));
          
          // 新しい画像パスを設定
          elem.exportedImagePath = newDecorImageFileName;
          console.log("Updated element path:", elem.exportedImagePath);
          
        } catch (error: any) {
          console.error("\n=== Stability AI API Error ===");
          console.error("Error type:", error.constructor.name);
          console.error("Error message:", error.message);
          console.error("Error details:", error);
          throw error;
        }
      } else {
        console.warn(`Decoration image not found: ${decorImagePath}, skipping decoration`);
        continue;
      }
    }
  }
  
  // 処理後の確認
  console.log("\n=== Decoration Processing Results ===");
  const updatedElements = findDecorationElements(slide);
  updatedElements.forEach((elem, index) => {
    console.log(`\nElement ${index + 1}:`);
    console.log("Type:", elem.type);
    console.log("Updated image path:", elem.exportedImagePath);
    const fullPath = path.join(process.cwd(), "public", "projects", resourcesDir, elem.exportedImagePath);
    console.log("Full path exists:", fs.existsSync(fullPath));
  });
}

// 装飾要素を見つける補助関数
function findDecorationElements(slide: any) {
  const decorElements: any[] = [];

  function traverseShape(shape: any) {
    if (shape.type !== "Placeholder" && shape.exportedImagePath) {
      decorElements.push(shape);
    }
    if (shape.groupItems && Array.isArray(shape.groupItems)) {
      shape.groupItems.forEach((item: any) => traverseShape(item));
    }
  }

  if (slide.shapes && Array.isArray(slide.shapes)) {
    slide.shapes.forEach((shape: any) => traverseShape(shape));
  }

  return decorElements;
}

// スライド内の画像を保存する補助関数を修正
async function saveSlideImages(slide: any, resourcesDir: string) {
  const processedShapes = [];
  
  const processShape = async (shape: any) => {
    const processedShape = { ...shape };
    
    if (processedShape.exportedImagePath?.startsWith('data:')) {
      const fileName = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
      const savedPath = await saveBase64Image(
        processedShape.exportedImagePath,
        fileName,
        resourcesDir
      );
      processedShape.exportedImagePath = savedPath;
    }
    
    if (processedShape.groupItems) {
      processedShape.groupItems = await Promise.all(
        processedShape.groupItems.map(processShape)
      );
    }
    
    return processedShape;
  };

  if (slide.shapes) {
    for (const shape of slide.shapes) {
      const processedShape = await processShape(shape);
      processedShapes.push(processedShape);
    }
  }
  
  return processedShapes;
}

// Geminiの応答を検証する関数を追加
function validateGeminiResponse(customizationPlan: any, processedSlides: any[]) {
  // 入力されたスライド数と出力されたスライド数が一致することを確認
  if (customizationPlan.slides.length !== processedSlides.length) {
    throw new Error(`スライド数が一致しません。入力: ${processedSlides.length}, 出力: ${customizationPlan.slides.length}`);
  }

  // スライド番号の重複チェック
  const slideNumbers = customizationPlan.slides.map((s: any) => s.slideNumber);
  const uniqueSlideNumbers = new Set(slideNumbers);
  if (slideNumbers.length !== uniqueSlideNumbers.size) {
    throw new Error('スライド番号に重複があります');
  }

  // スライド番号の存在チェックと順序チェック
  const expectedSlideNumbers = processedSlides.map(s => s.slideIndex);
  for (let i = 0; i < expectedSlideNumbers.length; i++) {
    if (customizationPlan.slides[i].slideNumber !== expectedSlideNumbers[i]) {
      throw new Error(`スライド番号の順序が不正です。期待: ${expectedSlideNumbers[i]}, 実際: ${customizationPlan.slides[i].slideNumber}`);
    }
  }

  return true;
}
