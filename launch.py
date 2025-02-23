import os
import sys
import subprocess
import platform

def install_requirements():
    print("必要なパッケージをインストール中...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "gitpython",
            "huggingface_hub"
        ])
        global git
        import git
    except Exception as e:
        print(f"パッケージのインストールに失敗しました: {e}")
        sys.exit(1)

def clone_webui():
    try:
        # WebUIリポジトリのクローン
        if not os.path.exists("stable-diffusion-webui"):
            print("Stable Diffusion WebUIをクローン中...")
            git.Repo.clone_from(
                "https://github.com/AUTOMATIC1111/stable-diffusion-webui.git",
                "stable-diffusion-webui"
            )
            print("クローン完了")
        else:
            print("WebUIフォルダは既に存在します")
    except Exception as e:
        print(f"WebUIのクローンに失敗しました: {e}")
        sys.exit(1)

def download_model():
    try:
        # モデルダウンロード用ディレクトリ作成
        models_dir = os.path.join("stable-diffusion-webui", "models", "Stable-diffusion")
        os.makedirs(models_dir, exist_ok=True)
        
        # v1.5モデルが存在しない場合、ダウンロード
        model_path = os.path.join(models_dir, "v1-5-pruned.safetensors")
        if not os.path.exists(model_path):
            print("基本モデルをダウンロード中...")
            import huggingface_hub
            huggingface_hub.hf_hub_download(
                "runwayml/stable-diffusion-v1-5",
                "v1-5-pruned.safetensors",
                local_dir=models_dir,
                local_dir_use_symlinks=False
            )
            print("モデルのダウンロード完了")
    except Exception as e:
        print(f"モデルのダウンロードに失敗しました: {e}")
        sys.exit(1)

def launch_webui():
    try:
        webui_dir = os.path.abspath("stable-diffusion-webui")
        if not os.path.exists(webui_dir):
            print(f"エラー: WebUIフォルダが見つかりません: {webui_dir}")
            sys.exit(1)

        if platform.system() == "Windows":
            launch_script = os.path.join(webui_dir, "webui-user.bat")
        else:
            launch_script = os.path.join(webui_dir, "webui.sh")

        if not os.path.exists(launch_script):
            print(f"エラー: 起動スクリプトが見つかりません: {launch_script}")
            sys.exit(1)
        
        # 環境変数の設定
        env = os.environ.copy()
        env["COMMANDLINE_ARGS"] = "--listen --api --xformers"
        
        print(f"Stable Diffusion WebUIを起動中... スクリプト: {launch_script}")
        subprocess.run(launch_script, env=env, cwd=webui_dir, shell=True)
    except Exception as e:
        print(f"WebUIの起動に失敗しました: {e}")
        sys.exit(1)

def main():
    try:
        # 現在のディレクトリを表示
        print(f"作業ディレクトリ: {os.getcwd()}")
        
        install_requirements()
        clone_webui()
        download_model()
        launch_webui()
        
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 