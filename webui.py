import gradio as gr
import torch
from diffusers import StableDiffusionPipeline

def generate_image(prompt, negative_prompt="", num_steps=50, guidance_scale=7.5):
    # モデルの初期化
    model_id = "runwayml/stable-diffusion-v1-5"
    pipe = StableDiffusionPipeline.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    )
    
    if torch.cuda.is_available():
        pipe = pipe.to("cuda")
    
    # 画像生成
    image = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=num_steps,
        guidance_scale=guidance_scale
    ).images[0]
    
    return image

# Gradio インターフェースの作成
def create_interface():
    with gr.Blocks() as interface:
        gr.Markdown("# Stable Diffusion Web UI")
        
        with gr.Row():
            with gr.Column():
                prompt = gr.Textbox(label="プロンプト")
                negative_prompt = gr.Textbox(label="ネガティブプロンプト")
                steps = gr.Slider(minimum=1, maximum=100, value=50, step=1, label="ステップ数")
                guidance = gr.Slider(minimum=1, maximum=20, value=7.5, step=0.1, label="ガイダンススケール")
                generate_btn = gr.Button("生成")
            
            with gr.Column():
                output = gr.Image(label="生成された画像")
        
        generate_btn.click(
            fn=generate_image,
            inputs=[prompt, negative_prompt, steps, guidance],
            outputs=output
        )
    
    return interface

if __name__ == "__main__":
    interface = create_interface()
    interface.launch(server_name="localhost", server_port=7860) 