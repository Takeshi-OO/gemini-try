# marria
結婚式のプロフィールムービー生成アプリ

# 開発環境整備

## chatgpt

chatgptアカウント作成→2000円くらいのプラン契約
以降の操作でわからないことがあったら一回GPTに聞いて。聞き方は下のGPTへの聞き方参照

testtest

## ffmpeg

ffmpegをインストールしてパスを通す

FFmpeg公式サイトの少し下、Windowsマークにカーソルを合わせる
Windows EXE Filesの「Windows builds from gyan.dev」をクリック
git master buildsの「ffmpeg-git-essentials.7z」をクリック
ダウンロード後解凍
ｃドライブ内に「ffmpeg」フォルダを作成
解凍後の中身の「bin」「doc」などのファイルを全て切り取って「ffmpeg」フォルダに貼り付け
スタートメニューから「環境変数」を検索、「システム環境変数の編集」を選択
「Path」を選択し、「編集」をクリック
「新規」をクリックして、「C:\ffmpeg\bin」 と入力→「OK」
「スタートメニュー」を右クリック、「ターミナル」をクリック
「ffmpeg -version」をコピペして、コマンドを実行
FFmpegのバージョン情報が表示さればインストールとパス通しが完了。

## vscode

vscodeインストール
共有フォルダの共有リンクを武史から教えてもらってそこにあるプラグインのリストを取得する(extensions.txt)
vsコードにプラグインをインストール
　全部で１６個あるけど一部重複してインストール出来ないのもあります
　それはそれでOK
　（例、ms-toolsai.jupyterをインストールすると
　　　　ms-toolsai.jupyter-keymap　と
　　　　ms-toolsai.jupyter-renderers　はインストール不要　）


## git

gitインストール
Windows版を選択、「Click here to download」でダウンロード、そのままインストール
「スタートメニュー」右クリック→「ターミナル」で「git --version」実行
バージョン情報が表示されれば成功

## github

githubアカウント作成
githubコパイロット（10＄くらいのpro）契約
github登録メールアドレスを武史に送る
武史からgithubプロジェクトに招待してもらう。
vscode左上の表示>ターミナルを開く
gitをインストール（gitとgithubは別物）
vscodeでgitの設定
ｃドライブに「projects」フォルダを作成
場所はC:\Users\○○○○\projects
　　　　　　　　 ↑ここはユーザー名が入る
上記フォルダにmarriaリポジトリをクローン

git clone https://github.com/Takeshi-OO/marria.git


## githubコパイロット

vscodeでgithubコパイロットが使えるようにする


## 認証情報の配置

共有フォルダから認証情報フォルダをダウンロード

この認証情報のフォルダのうち、まず「.env.local」をダウンロードしてC:\Users\{Windowsユーザー名}\projects\marriaフォルダに保存。

名前が「.env.downroad」になっていたら「.env.local」に名前を変更する

keysフォルダはC:\Users\{Windowsユーザー名}フォルダに保存。

.env.local内のGOOGLE_APPLICATION_CREDENTIALS="C:\\Users\\{Windowsユーザー名}\\keys\\filmarria-9271bde45884.json"の{Windowsユーザー名}をそのWindowsユーザー名に書き換えて




## パッケージのインストール

vscodeを起動
ファイル＞フォルダーからプロジェクトディレクトリを開く（「marria」を開いて「フォルダを選択」をクリック）
ターミナルが表示されていなければ表示＞ターミナル

下記プログラムを実行、実行ポリシーを「RemoteSigned」に設定
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

実行ポリシーを設定後、npmをインストール、下記プログラム実行
npm install




# 開発の操作方法

## git graphでブランチを切る

fetchでgithubの情報を取得

git graphでmainと表示されている行を右クリックしてcreate branch→

名前を入力してcheck outにチェックを入れてOK

## cursorのコンポーザーに指示を入力してコードを生成

指示を入力してとりあえず提案を許可し以下の方法でテスト。見て欲しいファイルはドラッグドロップ

問題があれば前の指示の右上の↑矢印で元に戻せる。✐マークで元に戻しかつ指示を修正しできる。

### 参考

ファイル操作をせずに回答してほしいだけの時chatタブ

コメントである#をコードの中に書いてエンターを押すと、cursorはコメントに合わせて提案を書いてくれる。tabで承認。


## 開発サーバーを起動してテストする

npm run dev
ターミナルに出力される

Local:    http://localhost:3000
　　　　　　　　　↑
　　　ここをctrl押しながらクリック

ブラウザが立ち上げるのでそれでアプリをテストできる

テストを終わらせたいときはctrl+C

前と同じコマンドを入れたいときはキーボードの「↑」キーで履歴を遡れる

## 修正

ファイルが赤くなっているのはリンターエラー（cursorで認識できる形式のエラー）
カーソルを重ねるとエラー内容がホバーする。基本的には自動で修正してくれるが、修正してくれない時は赤くなくなるまでcomporserボタンを押して聞く。

ブラウザでエラーが出た場合は、

「あなたの提案通りにコードを変更して実行すると、AAAのBBBに以下のエラーが表示されます。原因は何ですか？（エラー内容コピペ）」と聞く。


## なかなか解決できない難問の解決方法

### まずログを出力させる
上記の「原因は何ですか？」の指示を以下に変更
「原因を特定できるようにターミナルにログを出力してください。」

ターミナルではなくブラウザのコンソールにログが出る場合がある。その時はブラウザを右クリックして「検証」をクリックして、コンソールタブをクリック。

「ログの出力は以下の通りです。何が原因かわかりますか？（ログをコピペ）」と聞く。

### 指示を一つだけにする
色々一緒に依頼すると失敗しやすい。一つだけでも失敗する場合は、その一つのタスクをさらに簡単な複数の指示に分割する。

### さらに回答精度を上げたいとき

GPTは会話履歴を参考に最も確率が高い単語を出力するアプリ。回答精度を上げたかったら

➀必要な情報を漏れなく入力する。（前提や環境、何をしてほしいのか最後まで書く）

➁話題が変わったら会話を続けない。新規作成するか、質問を編集する

➂無駄な情報を入力しない

➃長文は情報ごとに###(タイトル)###で区切る


## 保存

まとめて保存ではなく一つcursorの指示が成功したら下の操作でコミットしてプッシュ

ファイルの変更を保存するときはctrl+s

注意：pptファイルなどの100MB以上のファイルはgithubに送信できないので、.gitignoreに追加しておく

分岐マークを押してgitgraphでステージ（保存範囲の確定）→✨を押してメッセージ入力（一番上に一言日本語書く）→コミット（端末内での保存）→「ブランチの発行」又は「同期」（githubへの送信）
詳細は動画参照

cursorへの指示に戻って次の機能を追加する

# 本日の作業が終わったら

分岐マーク→ソース管理の隣のプルリクエスト→baseはメイン、mergeは本日作ったブランチ名、その下はたぶんmainで良い。
descriptionは日本語で本日の作業を簡単に書く。そしてcreate

同じ文章をnotionのタスクページにコピペ


# ディレクトリ構造取得方法
## vscodeのターミナルでフォルダを進む、戻る

cd xxで進む（xxは子フォルダ。フルパスで一気に移動もできる）
cd ..で戻る


## gptに伝えるために今のフォルダ構造をリストアップ

Get-ChildItem | Select-Object Mode, Name



# エラーが出た場合の対応（以下はcopilotとGPTの時代のものなので今は無視）

## 使い分け

・「,」が足りないとか考えなくていいレベルのエラーならホバーからcopilotを使用して修正

・簡単なコード追加なら欲しい機能をコメントアウト状態で書いて改行するとcopilotによりサジェスチョンされるのでtabで確定

・わからないことがあったらGPTに聞く。

# GPTへの聞き方

## 使い分け

ちゃんと考えて欲しいときはo1。素早く聞きたいときは4o


## GPTの精度向上方法

GPTは会話履歴を参考に最も確率が高い単語を出力するアプリ。回答精度を上げたかったら

➀必要な情報を漏れなく入力する。（前提や環境、何をしてほしいのか最後まで書く）

➁話題が変わったら会話を続けない。新規作成するか、質問を編集する

➂無駄な情報を入力しない

➃長文は情報ごとに###(タイトル)###で区切る



## GPTの会話開始時の一言目の例 

###背景###
AAAをBBBするWEBアプリTypescript,Next.js,Reactで開発しています。
開発環境はWindows11,VSCode,Powershell,npmです。


###指示###
CCCをするとDDDに以下のエラーが出ました。どのコードをどう変更すればいいか教えてください。なお、関連するコード（必要な場合はディレクトリ構造も）は以下の通りです。

###エラー内容###
（エラー内容コピペ）

###EEE/FFF/GGG.tsx###(←VScodeで相談したいファイルを右クリックして相対パスをコピー)
（ファイルコピペ）

###EEE/FFF/HHH.tsx###
（ファイルコピペ）

###ディレクトリ構造###
（ディレクトリ構造コピペ）











