import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image) {
      return NextResponse.json(
        { error: "画像が見つかりません" },
        { status: 400 }
      );
    }

    // Stability AIのAPIを呼び出す
    const response = await fetch('https://api.stability.ai/v1/generation/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Stability AI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('画像生成エラー:', error);
    return NextResponse.json(
      { error: error.message || '画像生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 