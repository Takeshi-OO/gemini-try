Attribute VB_Name = "PPTExporter"
Option Explicit

' PowerPointのトランジション効果の定数
Private Const ppEffectNone = 0
Private Const ppEffectCut = 257
Private Const ppEffectFade = 1
Private Const ppEffectPush = 3844
Private Const ppEffectWipe = 3841
Private Const ppEffectSplit = 3849
Private Const ppEffectReveal = 3842
Private Const ppEffectRandomBars = 3847
Private Const ppEffectDissolve = 1537

' PowerPointのトランジション速度の定数
Private Const ppTransitionSpeedSlow = 2
Private Const ppTransitionSpeedMedium = 1
Private Const ppTransitionSpeedFast = 3

' アニメーションの方向の定数
Private Const msoAnimDirectionUp = 1
Private Const msoAnimDirectionDown = 2
Private Const msoAnimDirectionLeft = 3
Private Const msoAnimDirectionRight = 4
Private Const msoAnimDirectionInward = 5
Private Const msoAnimDirectionOutward = 6
Private Const msoAnimDirectionUpLeft = 7
Private Const msoAnimDirectionUpRight = 8
Private Const msoAnimDirectionDownLeft = 9
Private Const msoAnimDirectionDownRight = 10

'====================================================================
' PowerPoint上の全てのスライド/Shapes情報を取得し、JSONをファイルに出力する

Sub ExportSlidesToJson()
    Dim pres As Presentation
    Dim sld As Slide
    Dim baseOutputPath As String
    Dim outputPath As String
    Dim resourcesPath As String
    Dim slidesPath As String
    Dim version1Path As String
    Dim jsonResult As String
    Dim outputNumber As Long
    Dim currentTime As String

    ' 現在のプレゼンテーションのパスを基準に出力先を設定
    Dim pptFileName As String
    pptFileName = Left(ActivePresentation.Name, InStrRev(ActivePresentation.Name, ".") - 1)
    
    ' PPTファイル名のディレクトリを作成
    Dim pptDirPath As String
    pptDirPath = ActivePresentation.Path & "\" & pptFileName
    If Dir(pptDirPath, vbDirectory) = "" Then
        MkDir pptDirPath
    End If
    
    baseOutputPath = pptDirPath

    ' 出力フォルダが存在しない場合は作成
    If Dir(baseOutputPath, vbDirectory) = "" Then
        MkDir baseOutputPath
    End If
    
    ' 次の出力番号を取得
    outputNumber = GetNextOutputNumber(baseOutputPath)
    
    ' 出力パスを設定
    outputPath = baseOutputPath & "\output" & outputNumber
    resourcesPath = outputPath & "\resources"
    slidesPath = outputPath & "\slides"
    
    ' 必要なフォルダを作成
    MkDir outputPath
    MkDir resourcesPath
    MkDir slidesPath

    Set pres = ActivePresentation
    
    ' 現在時刻をISO 8601形式で取得
    currentTime = Format(Now, "yyyy-mm-ddThh:mm:ssZ")
    
    ' project.jsonを生成
    Dim projectJson As String
    projectJson = "{"
    projectJson = projectJson & """name"": """ & EscapeJsonString(pres.Name) & ""","
    projectJson = projectJson & """createdAt"": """ & currentTime & ""","
    projectJson = projectJson & """updatedAt"": """ & currentTime & """"
    projectJson = projectJson & "}"
    
    ' project.jsonを保存
    WriteTextFile outputPath & "\project.json", projectJson
    
    ' スライドごとにフォルダを作成し、情報を保存
    Dim sldIndex As Long
    Dim slideStates As String
    slideStates = "{"
    
    For sldIndex = 1 To pres.Slides.Count
        Set sld = pres.Slides(sldIndex)
        
        ' スライドフォルダのパスを設定
        Dim currentSlidePath As String
        currentSlidePath = slidesPath & "\slide" & sldIndex
        
        ' スライドフォルダを作成
        MkDir currentSlidePath
        
        ' version1フォルダを作成
        Dim slideVersion1Path As String
        slideVersion1Path = currentSlidePath & "\version1"
        MkDir slideVersion1Path
        
        ' スライドを画像として保存
        sld.Export slideVersion1Path & "\slide" & sldIndex & ".png", "PNG"
        
        ' スライドのJSONを生成して保存
        Dim slideJson As String
        slideJson = GetSlideJson(sld, resourcesPath)
        WriteTextFile slideVersion1Path & "\slide" & sldIndex & ".json", slideJson
        
        ' states.json用のスライド状態を追加
        slideStates = slideStates & """slide" & sldIndex & """: ""version1"""
        If sldIndex < pres.Slides.Count Then
            slideStates = slideStates & ","
        End If
    Next sldIndex
    
    slideStates = slideStates & "}"
    
    ' states.jsonを生成
    Dim statesJson As String
    statesJson = "["
    statesJson = statesJson & "{"
    statesJson = statesJson & """id"": ""state1"","
    statesJson = statesJson & """slides"": " & slideStates
    statesJson = statesJson & "}"
    statesJson = statesJson & "]"
    
    ' commits.jsonを生成
    Dim commitsJson As String
    commitsJson = "["
    commitsJson = commitsJson & "{"
    commitsJson = commitsJson & """id"": ""commit1"","
    commitsJson = commitsJson & """parentCommitId"": null,"
    commitsJson = commitsJson & """stateId"": ""state1"","
    commitsJson = commitsJson & """createdAt"": """ & currentTime & """"
    commitsJson = commitsJson & "}"
    commitsJson = commitsJson & "]"
    
    ' JSONファイルを保存
    WriteTextFile outputPath & "\states.json", statesJson
    WriteTextFile outputPath & "\commits.json", commitsJson
    
    MsgBox "JSONの書き出しと画像の保存が完了しました。", vbInformation
End Sub

'====================================================================
' 次の出力番号を取得する関数
Private Function GetNextOutputNumber(baseOutputPath As String) As Long
    Dim folderPath As String
    Dim maxNumber As Long
    Dim currentNumber As Long
    
    maxNumber = 0
    folderPath = Dir(baseOutputPath & "\output*", vbDirectory)
    
    While folderPath <> ""
        If Left(folderPath, 6) = "output" Then
            currentNumber = Val(Mid(folderPath, 7))
            If currentNumber > maxNumber Then
                maxNumber = currentNumber
            End If
        End If
        folderPath = Dir()
    Wend
    
    GetNextOutputNumber = maxNumber + 1
End Function

'====================================================================
' 指定スライドの情報をJSON形式の文字列で返す関数

Private Function GetSlideJson(sld As Slide, outputPath As String) As String
    Dim sb As String
    Dim slideWidth As Single
    Dim slideHeight As Single
    
    slideWidth = sld.Parent.PageSetup.slideWidth
    slideHeight = sld.Parent.PageSetup.slideHeight
    
    sb = "{"
    sb = sb & """slideIndex"": " & sld.slideIndex & ","
    sb = sb & """width"": " & slideWidth & ","
    sb = sb & """height"": " & slideHeight & ","
    
    ' スライドの表示時間を追加（秒単位）
    On Error Resume Next
    Dim advanceTime As Single
    advanceTime = sld.SlideShowTransition.AdvanceTime
    If Err.Number = 0 And advanceTime > 0 Then
        sb = sb & """displayDuration"": " & advanceTime & ","
    End If
    On Error GoTo 0
    
    ' トランジション情報を追加
    On Error Resume Next
    With sld.SlideShowTransition
        sb = sb & """transition"": {"
        sb = sb & """type"": """ & GetTransitionTypeName(.EntryEffect) & ""","
        sb = sb & """duration"": " & .Duration & ","
        sb = sb & """speed"": """ & GetTransitionSpeedName(.Speed) & """"
        sb = sb & "},"
    End With
    On Error GoTo 0
    
    sb = sb & """shapes"": ["
    
    Dim shpIndex As Long
    Dim shpCount As Long
    shpCount = sld.Shapes.Count
    
    For shpIndex = 1 To shpCount
        sb = sb & GetShapeJson(sld.Shapes(shpIndex), outputPath)
        If shpIndex < shpCount Then
            sb = sb & ","
        End If
    Next shpIndex
    

    sb = sb & "],""animations"": ["
    sb = sb & GetAnimationJson(sld)
    sb = sb & "]"
    
    sb = sb & "}"
    
    GetSlideJson = sb
End Function

'====================================================================
' 指定Shape(図形)の情報をJSON形式の文字列で返す関数

Private Function GetShapeJson(shp As Shape, outputPath As String) As String
    Dim sb As String
    sb = "{"
    sb = sb & """name"": """ & EscapeJsonString(shp.Name) & ""","
    sb = sb & """id"": " & shp.Id & ","
    sb = sb & """type"": """ & GetShapeTypeName(shp) & ""","
    sb = sb & """left"": " & shp.Left & ","
    sb = sb & """top"": " & shp.Top & ","
    sb = sb & """width"": " & shp.Width & ","
    sb = sb & """height"": " & shp.Height & ","
    sb = sb & """rotation"": " & shp.Rotation & ","
    sb = sb & """zOrder"": " & shp.ZOrderPosition & ","
    
    ' グループ化されている場合は再帰的に子要素を取得
    If shp.Type = msoGroup Then
        sb = sb & """groupItems"": ["
        Dim i As Long
        For i = 1 To shp.GroupItems.Count
            sb = sb & GetShapeJson(shp.GroupItems(i), outputPath)
            If i < shp.GroupItems.Count Then
                sb = sb & ","
            End If
        Next i
        sb = sb & "]"
        
    Else
        ' テキスト情報
        If shp.HasTextFrame Then
            If shp.TextFrame2.HasText Then
                If Not ShouldSkipShape(shp) Then
                    sb = sb & """text"": """ & EscapeJsonString(shp.TextFrame2.TextRange.Text) & ""","
                    
                    ' フォント情報
                    sb = sb & """font"": {"
                    sb = sb & """name"": """ & EscapeJsonString(shp.TextFrame2.TextRange.Font.Name) & ""","
                    sb = sb & """size"": " & shp.TextFrame2.TextRange.Font.Size & ","
                    sb = sb & """color"": """ & ColorToRGBHex(shp.TextFrame2.TextRange.Font.Fill.ForeColor.RGB) & """"
                    sb = sb & "},"

                    ' 段落や整列などのテキストフレーム設定
                    sb = sb & """textFrameProperties"": {"
                    
                    ' TextFrame2 の ParagraphFormat
                    sb = sb & """alignment"": """ & GetMsoParagraphAlignmentName(shp.TextFrame2.TextRange.ParagraphFormat.Alignment) & ""","
                    sb = sb & """indentLevel"": " & shp.TextFrame2.TextRange.ParagraphFormat.IndentLevel & ","
                    sb = sb & """lineSpacing"": " & shp.TextFrame2.TextRange.ParagraphFormat.SpaceWithin & ","
                    
                    ' TextFrame2 全体のマージン
                    sb = sb & """marginTop"": " & shp.TextFrame2.MarginTop & ","
                    sb = sb & """marginBottom"": " & shp.TextFrame2.MarginBottom & ","
                    sb = sb & """marginLeft"": " & shp.TextFrame2.MarginLeft & ","
                    sb = sb & """marginRight"": " & shp.TextFrame2.MarginRight & ""

                    sb = sb & "},"

                End If
            End If
        End If
        
        ' 塗りつぶし色・線の色
        If shp.Fill.Visible = msoTrue Then
            sb = sb & """fillColor"": """ & ColorToRGBHex(shp.Fill.ForeColor.RGB) & ""","
            sb = sb & """fillTransparency"": " & shp.Fill.Transparency & ","
        End If

        If shp.Line.Visible = msoTrue Then
            sb = sb & """lineColor"": """ & ColorToRGBHex(shp.Line.ForeColor.RGB) & ""","
        End If
        
        ' JSON だけでは再現しにくい形状などに対してPNGエクスポート
        Dim exportNeeded As Boolean
        exportNeeded = False
        
        Select Case shp.Type
            Case msoFreeform, msoSmartArt, msoChart, msoTable
                exportNeeded = True
            Case msoAutoShape
                Select Case shp.AutoShapeType
                    Case msoShapeRectangle
                        exportNeeded = False
                    Case Else
                        exportNeeded = True
                End Select

            Case msoPicture
                ' 絵や画像を含む場合はエクスポート対象とする
                exportNeeded = True
            Case msoMedia
                ' Media(動画)の場合は別途処理
                On Error Resume Next
                sb = sb & """mediaFileName"": """ & EscapeJsonString(shp.LinkFormat.SourceFullName) & ""","
                On Error GoTo 0
            Case msoPlaceholder
                ' プレースホルダーの中でも、画像プレースホルダーの場合はエクスポート
                On Error Resume Next
                If shp.PlaceholderFormat.Type = ppPlaceholderPicture Then
                    exportNeeded = True
                End If
                On Error GoTo 0
            Case Else
                ' テキストボックスやプレースホルダなどは必要に応じて exportNeeded = True にする
        End Select
        
        If exportNeeded Then
            Dim imgPath As String
            Dim slideIndex As Long
            slideIndex = shp.Parent.slideIndex
            
            ' ファイル名を小文字に変更
            imgPath = outputPath & "\slide" & slideIndex & "_shape" & LCase(shp.Id) & ".png"
            
            On Error Resume Next
            shp.Export imgPath, ppShapeFormatPNG
            On Error GoTo 0
            
            sb = sb & """exportedImagePath"": """ & EscapeJsonString("slide" & slideIndex & "_shape" & LCase(shp.Id) & ".png") & ""","
        End If
        
        sb = RemoveTrailingComma(sb)
    End If
    
    sb = sb & "}"
    
    GetShapeJson = sb
End Function

' 湾曲しているかどうかを判定する関数
Function ShouldSkipShape(ByVal shp As Shape) As Boolean
    
    Dim presetVal As Long

    ShouldSkipShape = False
    
    On Error Resume Next
    presetVal = shp.TextEffect.PresetShape
    On Error GoTo 0
    
    ' Type=17 = msoTextBox
    If shp.Type = msoTextBox Then
        Select Case presetVal
            Case 9, 10  ' ArchUpCurve(9), ArchDownCurve(10)
                ShouldSkipShape = True
        End Select
    End If
    
End Function


' テキストの段落整列を判定して文字列にする
Private Function GetMsoParagraphAlignmentName(ByVal align As MsoParagraphAlignment) As String
    Select Case align
        Case msoAlignLeft
            GetMsoParagraphAlignmentName = "Left"
        Case msoAlignCenter
            GetMsoParagraphAlignmentName = "Center"
        Case msoAlignRight
            GetMsoParagraphAlignmentName = "Right"
        Case msoAlignJustify
            GetMsoParagraphAlignmentName = "Justify"
        Case msoAlignDistribute
            GetMsoParagraphAlignmentName = "Distribute"
        ' 必要に応じて他の定数を追加
        Case Else
            GetMsoParagraphAlignmentName = "Other(" & align & ")"
    End Select
End Function



'====================================================================
' スライドのメインシーケンスのアニメーション情報を取得(詳細版)

Private Function GetAnimationJson(sld As Slide) As String
    Dim seq As Sequence
    Set seq = sld.TimeLine.MainSequence
    
    Dim eff As Effect
    Dim sb As String
    Dim i As Long
    
    For i = 1 To seq.Count
        Set eff = seq(i)
        sb = sb & "{"
        sb = sb & """shapeId"": " & eff.Shape.Id & ","
        sb = sb & """effectType"": """ & GetEffectTypeName(eff.effectType) & ""","
        
        ' エントリー/イグジット情報を追加
        sb = sb & """isExit"": " & LCase(CStr(eff.Exit)) & ","
        
        sb = sb & """triggerType"": """ & GetTriggerTypeName(eff.Timing.triggerType) & ""","
        
        ' アニメーションの詳細情報を追加
        sb = sb & """duration"": " & eff.Timing.Duration & ","
        sb = sb & """delay"": " & eff.Timing.TriggerDelayTime & ","
        
        ' エフェクトパラメータから方向を取得
        On Error Resume Next
        If Not eff.EffectParameters Is Nothing Then
            sb = sb & """direction"": """ & GetEffectParameterName(eff.EffectParameters.Direction) & ""","
        End If
        On Error GoTo 0
        
        ' アニメーションの移動情報を取得（フライインなどの場合）
        On Error Resume Next
        Dim behavior As AnimationBehavior
        Dim j As Long
        
        For j = 1 To eff.Behaviors.Count
            Set behavior = eff.Behaviors(j)
            
            If behavior.Type = msoAnimTypeMotion Then
                sb = sb & """motionEffect"": {"
                
                ' PropertyEffectを取得
                Dim propEffect As Object
                Set propEffect = behavior.PropertyEffect
                
                If Not propEffect Is Nothing Then
                    ' 位置情報を取得
                    Dim points As String
                    points = propEffect.Points
                    
                    If points <> "" Then
                        Dim pointsArray() As String
                        pointsArray = Split(points, ";")
                        
                        If UBound(pointsArray) >= 0 Then
                            ' 開始位置
                            Dim startPoint() As String
                            startPoint = Split(pointsArray(0), ",")
                            If UBound(startPoint) >= 1 Then
                                sb = sb & """fromX"": " & Val(startPoint(0)) & ","
                                sb = sb & """fromY"": " & Val(startPoint(1)) & ","
                            End If
                            
                            ' 終了位置
                            If UBound(pointsArray) >= 1 Then
                                Dim endPoint() As String
                                endPoint = Split(pointsArray(UBound(pointsArray)), ",")
                                If UBound(endPoint) >= 1 Then
                                    sb = sb & """toX"": " & Val(endPoint(0)) & ","
                                    sb = sb & """toY"": " & Val(endPoint(1))
                                End If
                            End If
                            
                            ' パスポイントが3つ以上ある場合はパスとして追加
                            If UBound(pointsArray) >= 2 Then
                                sb = sb & ",""path"": """ & EscapeJsonString(points) & """"
                            End If
                        End If
                    End If
                End If
                
                sb = sb & "},"
            End If
        Next j
        On Error GoTo 0
        
        ' アニメーションの速度設定
        sb = sb & """accelerate"": " & eff.Timing.Accelerate & ","
        sb = sb & """decelerate"": " & eff.Timing.Decelerate & ","
        
        ' アニメーションの再生回数
        sb = sb & """repeatCount"": " & eff.Timing.RepeatCount & ","
        
        ' アニメーションの自動逆再生
        sb = sb & """autoReverse"": " & LCase(CStr(eff.Timing.AutoReverse))
        
        sb = sb & "}"
        If i < seq.Count Then
            sb = sb & ","
        End If
    Next i
    
    GetAnimationJson = sb
End Function

'====================================================================
' 効果(アニメーション)のタイプを文字列で返す関数

Private Function GetEffectTypeName(effectType As MsoAnimEffect) As String
    Select Case effectType
        Case msoAnimEffectAppear: GetEffectTypeName = "Appear"
        Case msoAnimEffectFly: GetEffectTypeName = "Fly"
        Case msoAnimEffectZoom: GetEffectTypeName = "Zoom"
        Case msoAnimEffectFade: GetEffectTypeName = "Fade"
        Case msoAnimEffectFloat: GetEffectTypeName = "Float"
        Case msoAnimEffectWipe: GetEffectTypeName = "Wipe"
        Case msoAnimEffectBox: GetEffectTypeName = "Box"
        Case msoAnimEffectDiamond: GetEffectTypeName = "Diamond"
        Case msoAnimEffectDissolve: GetEffectTypeName = "Dissolve"
        Case msoAnimEffectSplit: GetEffectTypeName = "Split"
        Case msoAnimEffectStretch: GetEffectTypeName = "Stretch"
        Case msoAnimEffectWheel: GetEffectTypeName = "Wheel"
        Case Else
            GetEffectTypeName = "Effect" & effectType
    End Select
End Function

'====================================================================
' アニメーションの方向を文字列で返す関数
Private Function GetEffectParameterName(direction As MsoAnimDirection) As String
    Select Case direction
        Case msoAnimDirectionUp: GetEffectParameterName = "Up"
        Case msoAnimDirectionDown: GetEffectParameterName = "Down"
        Case msoAnimDirectionLeft: GetEffectParameterName = "Left"
        Case msoAnimDirectionRight: GetEffectParameterName = "Right"
        Case msoAnimDirectionInward: GetEffectParameterName = "Inward"
        Case msoAnimDirectionOutward: GetEffectParameterName = "Outward"
        Case msoAnimDirectionUpLeft: GetEffectParameterName = "UpLeft"
        Case msoAnimDirectionUpRight: GetEffectParameterName = "UpRight"
        Case msoAnimDirectionDownLeft: GetEffectParameterName = "DownLeft"
        Case msoAnimDirectionDownRight: GetEffectParameterName = "DownRight"
        Case Else
            GetEffectParameterName = "Direction" & direction
    End Select
End Function

'====================================================================
' トリガーのタイプを文字列で返す関数

Private Function GetTriggerTypeName(triggerType As MsoAnimTriggerType) As String
    Select Case triggerType
        Case msoAnimTriggerOnPageClick: GetTriggerTypeName = "OnPageClick"
        Case msoAnimTriggerAfterPrevious: GetTriggerTypeName = "AfterPrevious"
        Case msoAnimTriggerWithPrevious: GetTriggerTypeName = "WithPrevious"
        Case Else
            GetTriggerTypeName = "Other(" & triggerType & ")"
    End Select
End Function

'====================================================================
' ShapeのTypeプロパティから名称を返す関数

Private Function GetShapeTypeName(shp As Shape) As String
    Select Case shp.Type
        Case msoAutoShape: GetShapeTypeName = "AutoShape"
        Case msoCallout: GetShapeTypeName = "Callout"
        Case msoChart: GetShapeTypeName = "Chart"
        Case msoComment: GetShapeTypeName = "Comment"
        Case msoFreeform: GetShapeTypeName = "Freeform"
        Case msoGroup: GetShapeTypeName = "Group"
        Case msoEmbeddedOLEObject: GetShapeTypeName = "EmbeddedOLEObject"
        Case msoLinkedOLEObject: GetShapeTypeName = "LinkedOLEObject"
        Case msoMedia: GetShapeTypeName = "Media"
        Case msoPicture: GetShapeTypeName = "Picture"
        Case msoPlaceholder: GetShapeTypeName = "Placeholder"
        Case msoTable: GetShapeTypeName = "Table"
        Case msoTextBox: GetShapeTypeName = "TextBox"
        Case Else
            GetShapeTypeName = "Other(" & shp.Type & ")"
    End Select
End Function

'====================================================================
' RGBを #RRGGBB 形式に変換する関数

Private Function ColorToRGBHex(lColor As Long) As String
    Dim r As Long, g As Long, b As Long
    r = lColor Mod 256
    g = (lColor \ 256) Mod 256
    b = (lColor \ 65536) Mod 256
    ColorToRGBHex = "#" & Right("0" & Hex(r), 2) & Right("0" & Hex(g), 2) & Right("0" & Hex(b), 2)
End Function

'====================================================================
' JSONで使用できない文字や改行等をエスケープする関数

Private Function EscapeJsonString(str As String) As String
    Dim s As String
    s = str
    s = Replace(s, "\", "\\")
    s = Replace(s, """", "\""")
    s = Replace(s, vbCrLf, "\n")
    s = Replace(s, vbCr, "\n")
    s = Replace(s, vbLf, "\n")
    EscapeJsonString = s
End Function

'====================================================================
' JSON要素を連結している最中に、不要な末尾カンマがあれば取り除く関数

Private Function RemoveTrailingComma(json As String) As String
    If Right(json, 1) = "," Then
        RemoveTrailingComma = Left(json, Len(json) - 1)
    Else
        RemoveTrailingComma = json
    End If
End Function

'====================================================================
' テキストファイルを UTF-8 (BOM付き) で書き込む関数

Private Sub WriteTextFile(ByVal filePath As String, ByVal content As String)
    Dim stm As Object
    Set stm = CreateObject("ADODB.Stream")

    stm.Type = 2 ' adTypeText

    stm.Mode = 3 ' adModeReadWrite

    stm.Open
    
    stm.Charset = "UTF-8"
    
    stm.WriteText content

    stm.SaveToFile filePath, 2 ' adSaveCreateOverWrite
    
    stm.Close
    Set stm = Nothing
End Sub

'====================================================================
' トランジションタイプを文字列で返す関数
Private Function GetTransitionTypeName(effectType As Long) As String
    Select Case effectType
        Case ppEffectFade: GetTransitionTypeName = "Fade"
        Case ppEffectCut: GetTransitionTypeName = "Cut"
        Case ppEffectDissolve: GetTransitionTypeName = "Dissolve"
        Case ppEffectPush: GetTransitionTypeName = "Push"
        Case ppEffectWipe: GetTransitionTypeName = "Wipe"
        Case ppEffectSplit: GetTransitionTypeName = "Split"
        Case ppEffectReveal: GetTransitionTypeName = "Reveal"
        Case ppEffectRandomBars: GetTransitionTypeName = "RandomBars"
        Case Else: GetTransitionTypeName = "Effect" & effectType
    End Select
End Function

'====================================================================
' トランジションスピードを文字列で返す関数
Private Function GetTransitionSpeedName(speed As Long) As String
    Select Case speed
        Case ppTransitionSpeedSlow: GetTransitionSpeedName = "Slow"
        Case ppTransitionSpeedMedium: GetTransitionSpeedName = "Medium"
        Case ppTransitionSpeedFast: GetTransitionSpeedName = "Fast"
        Case Else: GetTransitionSpeedName = "Speed" & speed
    End Select
End Function


