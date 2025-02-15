import os
import sys
from pathlib import Path
import torch
from PIL import Image
from diffusers import StableDiffusionPipeline, DDIMScheduler

def process_images():
    # 入出力ディレクトリのパスを設定
    input_dir = Path("input")
    output_dir = Path("output")
    
    # 出力ディレクトリが存在しない場合は作成
    output_dir.mkdir(exist_ok=True)
    
    # モデルの読み込み
    model_id = "runwayml/stable-diffusion-v1-5"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    pipe = StableDiffusionPipeline.from_pretrained(
        model_id,
        scheduler=DDIMScheduler.from_pretrained(model_id, subfolder="scheduler"),
        torch_dtype=torch.float16 if device == "cuda" else torch.float32
    ).to(device)
    
    # 入力ディレクトリ内の画像を処理
    for image_path in input_dir.glob("*"):
        if image_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            try:
                # 画像を読み込み
                init_image = Image.open(image_path).convert("RGB")
                
                # img2imgの設定
                prompt = "高品質な写真、細部まで美しく表現された画像"
                negative_prompt = "低品質、ぼやけている、不自然"
                
                # 画像生成
                result = pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    image=init_image,
                    strength=0.75,
                    guidance_scale=7.5,
                    num_inference_steps=50
                ).images[0]
                
                # 出力パスの設定
                output_path = output_dir / image_path.name
                
                # 生成した画像を保存
                result.save(output_path)
                print(f"生成完了: {image_path.name}")
                
            except Exception as e:
                print(f"エラー発生 ({image_path.name}): {str(e)}")
    
    print("すべての画像の処理が完了しました")

if __name__ == "__main__":
    process_images() 