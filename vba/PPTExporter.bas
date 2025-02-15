Attribute VB_Name = "PPTExporter"
Option Explicit

' PowerPoint�̃g�����W�V�������ʂ̒萔
Private Const ppEffectNone = 0
Private Const ppEffectCut = 257
Private Const ppEffectFade = 1
Private Const ppEffectPush = 3844
Private Const ppEffectWipe = 3841
Private Const ppEffectSplit = 3849
Private Const ppEffectReveal = 3842
Private Const ppEffectRandomBars = 3847
Private Const ppEffectDissolve = 1537

' PowerPoint�̃g�����W�V�������x�̒萔
Private Const ppTransitionSpeedSlow = 2
Private Const ppTransitionSpeedMedium = 1
Private Const ppTransitionSpeedFast = 3

' �A�j���[�V�����̕����̒萔
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
' PowerPoint��̑S�ẴX���C�h/Shapes�����擾���AJSON���t�@�C���ɏo�͂���

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

    ' ���݂̃v���[���e�[�V�����̃p�X����ɏo�͐��ݒ�
    Dim pptFileName As String
    pptFileName = Left(ActivePresentation.Name, InStrRev(ActivePresentation.Name, ".") - 1)
    
    ' PPT�t�@�C�����̃f�B���N�g�����쐬
    Dim pptDirPath As String
    pptDirPath = ActivePresentation.Path & "\" & pptFileName
    If Dir(pptDirPath, vbDirectory) = "" Then
        MkDir pptDirPath
    End If
    
    baseOutputPath = pptDirPath

    ' �o�̓t�H���_�����݂��Ȃ��ꍇ�͍쐬
    If Dir(baseOutputPath, vbDirectory) = "" Then
        MkDir baseOutputPath
    End If
    
    ' ���̏o�͔ԍ����擾
    outputNumber = GetNextOutputNumber(baseOutputPath)
    
    ' �o�̓p�X��ݒ�
    outputPath = baseOutputPath & "\output" & outputNumber
    resourcesPath = outputPath & "\resources"
    slidesPath = outputPath & "\slides"
    
    ' �K�v�ȃt�H���_���쐬
    MkDir outputPath
    MkDir resourcesPath
    MkDir slidesPath

    Set pres = ActivePresentation
    
    ' ���ݎ�����ISO 8601�`���Ŏ擾
    currentTime = Format(Now, "yyyy-mm-ddThh:mm:ssZ")
    
    ' project.json�𐶐�
    Dim projectJson As String
    projectJson = "{"
    projectJson = projectJson & """name"": """ & EscapeJsonString(pres.Name) & ""","
    projectJson = projectJson & """createdAt"": """ & currentTime & ""","
    projectJson = projectJson & """updatedAt"": """ & currentTime & """"
    projectJson = projectJson & "}"
    
    ' project.json��ۑ�
    WriteTextFile outputPath & "\project.json", projectJson
    
    ' �X���C�h���ƂɃt�H���_���쐬���A����ۑ�
    Dim sldIndex As Long
    Dim slideStates As String
    slideStates = "{"
    
    For sldIndex = 1 To pres.Slides.Count
        Set sld = pres.Slides(sldIndex)
        
        ' �X���C�h�t�H���_�̃p�X��ݒ�
        Dim currentSlidePath As String
        currentSlidePath = slidesPath & "\slide" & sldIndex
        
        ' �X���C�h�t�H���_���쐬
        MkDir currentSlidePath
        
        ' version1�t�H���_���쐬
        Dim slideVersion1Path As String
        slideVersion1Path = currentSlidePath & "\version1"
        MkDir slideVersion1Path
        
        ' �X���C�h���摜�Ƃ��ĕۑ�
        sld.Export slideVersion1Path & "\slide" & sldIndex & ".png", "PNG"
        
        ' �X���C�h��JSON�𐶐����ĕۑ�
        Dim slideJson As String
        slideJson = GetSlideJson(sld, resourcesPath)
        WriteTextFile slideVersion1Path & "\slide" & sldIndex & ".json", slideJson
        
        ' states.json�p�̃X���C�h��Ԃ�ǉ�
        slideStates = slideStates & """slide" & sldIndex & """: ""version1"""
        If sldIndex < pres.Slides.Count Then
            slideStates = slideStates & ","
        End If
    Next sldIndex
    
    slideStates = slideStates & "}"
    
    ' states.json�𐶐�
    Dim statesJson As String
    statesJson = "["
    statesJson = statesJson & "{"
    statesJson = statesJson & """id"": ""state1"","
    statesJson = statesJson & """slides"": " & slideStates
    statesJson = statesJson & "}"
    statesJson = statesJson & "]"
    
    ' commits.json�𐶐�
    Dim commitsJson As String
    commitsJson = "["
    commitsJson = commitsJson & "{"
    commitsJson = commitsJson & """id"": ""commit1"","
    commitsJson = commitsJson & """parentCommitId"": null,"
    commitsJson = commitsJson & """stateId"": ""state1"","
    commitsJson = commitsJson & """createdAt"": """ & currentTime & """"
    commitsJson = commitsJson & "}"
    commitsJson = commitsJson & "]"
    
    ' JSON�t�@�C����ۑ�
    WriteTextFile outputPath & "\states.json", statesJson
    WriteTextFile outputPath & "\commits.json", commitsJson
    
    MsgBox "JSON�̏����o���Ɖ摜�̕ۑ����������܂����B", vbInformation
End Sub

'====================================================================
' ���̏o�͔ԍ����擾����֐�
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
' �w��X���C�h�̏���JSON�`���̕�����ŕԂ��֐�

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
    
    ' �X���C�h�̕\�����Ԃ�ǉ��i�b�P�ʁj
    On Error Resume Next
    Dim advanceTime As Single
    advanceTime = sld.SlideShowTransition.AdvanceTime
    If Err.Number = 0 And advanceTime > 0 Then
        sb = sb & """displayDuration"": " & advanceTime & ","
    End If
    On Error GoTo 0
    
    ' �g�����W�V��������ǉ�
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
' �w��Shape(�}�`)�̏���JSON�`���̕�����ŕԂ��֐�

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
    
    ' �O���[�v������Ă���ꍇ�͍ċA�I�Ɏq�v�f���擾
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
        ' �e�L�X�g���
        If shp.HasTextFrame Then
            If shp.TextFrame2.HasText Then
                If Not ShouldSkipShape(shp) Then
                    sb = sb & """text"": """ & EscapeJsonString(shp.TextFrame2.TextRange.Text) & ""","
                    
                    ' �t�H���g���
                    sb = sb & """font"": {"
                    sb = sb & """name"": """ & EscapeJsonString(shp.TextFrame2.TextRange.Font.Name) & ""","
                    sb = sb & """size"": " & shp.TextFrame2.TextRange.Font.Size & ","
                    sb = sb & """color"": """ & ColorToRGBHex(shp.TextFrame2.TextRange.Font.Fill.ForeColor.RGB) & """"
                    sb = sb & "},"

                    ' �i���␮��Ȃǂ̃e�L�X�g�t���[���ݒ�
                    sb = sb & """textFrameProperties"": {"
                    
                    ' TextFrame2 �� ParagraphFormat
                    sb = sb & """alignment"": """ & GetMsoParagraphAlignmentName(shp.TextFrame2.TextRange.ParagraphFormat.Alignment) & ""","
                    sb = sb & """indentLevel"": " & shp.TextFrame2.TextRange.ParagraphFormat.IndentLevel & ","
                    sb = sb & """lineSpacing"": " & shp.TextFrame2.TextRange.ParagraphFormat.SpaceWithin & ","
                    
                    ' TextFrame2 �S�̂̃}�[�W��
                    sb = sb & """marginTop"": " & shp.TextFrame2.MarginTop & ","
                    sb = sb & """marginBottom"": " & shp.TextFrame2.MarginBottom & ","
                    sb = sb & """marginLeft"": " & shp.TextFrame2.MarginLeft & ","
                    sb = sb & """marginRight"": " & shp.TextFrame2.MarginRight & ""

                    sb = sb & "},"

                End If
            End If
        End If
        
        ' �h��Ԃ��F�E���̐F
        If shp.Fill.Visible = msoTrue Then
            sb = sb & """fillColor"": """ & ColorToRGBHex(shp.Fill.ForeColor.RGB) & ""","
            sb = sb & """fillTransparency"": " & shp.Fill.Transparency & ","
        End If

        If shp.Line.Visible = msoTrue Then
            sb = sb & """lineColor"": """ & ColorToRGBHex(shp.Line.ForeColor.RGB) & ""","
        End If
        
        ' JSON �����ł͍Č����ɂ����`��Ȃǂɑ΂���PNG�G�N�X�|�[�g
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
                ' �G��摜���܂ޏꍇ�̓G�N�X�|�[�g�ΏۂƂ���
                exportNeeded = True
            Case msoMedia
                ' Media(����)�̏ꍇ�͕ʓr����
                On Error Resume Next
                sb = sb & """mediaFileName"": """ & EscapeJsonString(shp.LinkFormat.SourceFullName) & ""","
                On Error GoTo 0
            Case msoPlaceholder
                ' �v���[�X�z���_�[�̒��ł��A�摜�v���[�X�z���_�[�̏ꍇ�̓G�N�X�|�[�g
                On Error Resume Next
                If shp.PlaceholderFormat.Type = ppPlaceholderPicture Then
                    exportNeeded = True
                End If
                On Error GoTo 0
            Case Else
                ' �e�L�X�g�{�b�N�X��v���[�X�z���_�Ȃǂ͕K�v�ɉ����� exportNeeded = True �ɂ���
        End Select
        
        If exportNeeded Then
            Dim imgPath As String
            Dim slideIndex As Long
            slideIndex = shp.Parent.slideIndex
            
            ' �t�@�C�������������ɕύX
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

' �p�Ȃ��Ă��邩�ǂ����𔻒肷��֐�
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


' �e�L�X�g�̒i������𔻒肵�ĕ�����ɂ���
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
        ' �K�v�ɉ����đ��̒萔��ǉ�
        Case Else
            GetMsoParagraphAlignmentName = "Other(" & align & ")"
    End Select
End Function



'====================================================================
' �X���C�h�̃��C���V�[�P���X�̃A�j���[�V���������擾(�ڍה�)

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
        
        ' �G���g���[/�C�O�W�b�g����ǉ�
        sb = sb & """isExit"": " & LCase(CStr(eff.Exit)) & ","
        
        sb = sb & """triggerType"": """ & GetTriggerTypeName(eff.Timing.triggerType) & ""","
        
        ' �A�j���[�V�����̏ڍ׏���ǉ�
        sb = sb & """duration"": " & eff.Timing.Duration & ","
        sb = sb & """delay"": " & eff.Timing.TriggerDelayTime & ","
        
        ' �G�t�F�N�g�p�����[�^����������擾
        On Error Resume Next
        If Not eff.EffectParameters Is Nothing Then
            sb = sb & """direction"": """ & GetEffectParameterName(eff.EffectParameters.Direction) & ""","
        End If
        On Error GoTo 0
        
        ' �A�j���[�V�����̈ړ������擾�i�t���C�C���Ȃǂ̏ꍇ�j
        On Error Resume Next
        Dim behavior As AnimationBehavior
        Dim j As Long
        
        For j = 1 To eff.Behaviors.Count
            Set behavior = eff.Behaviors(j)
            
            If behavior.Type = msoAnimTypeMotion Then
                sb = sb & """motionEffect"": {"
                
                ' PropertyEffect���擾
                Dim propEffect As Object
                Set propEffect = behavior.PropertyEffect
                
                If Not propEffect Is Nothing Then
                    ' �ʒu�����擾
                    Dim points As String
                    points = propEffect.Points
                    
                    If points <> "" Then
                        Dim pointsArray() As String
                        pointsArray = Split(points, ";")
                        
                        If UBound(pointsArray) >= 0 Then
                            ' �J�n�ʒu
                            Dim startPoint() As String
                            startPoint = Split(pointsArray(0), ",")
                            If UBound(startPoint) >= 1 Then
                                sb = sb & """fromX"": " & Val(startPoint(0)) & ","
                                sb = sb & """fromY"": " & Val(startPoint(1)) & ","
                            End If
                            
                            ' �I���ʒu
                            If UBound(pointsArray) >= 1 Then
                                Dim endPoint() As String
                                endPoint = Split(pointsArray(UBound(pointsArray)), ",")
                                If UBound(endPoint) >= 1 Then
                                    sb = sb & """toX"": " & Val(endPoint(0)) & ","
                                    sb = sb & """toY"": " & Val(endPoint(1))
                                End If
                            End If
                            
                            ' �p�X�|�C���g��3�ȏ゠��ꍇ�̓p�X�Ƃ��Ēǉ�
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
        
        ' �A�j���[�V�����̑��x�ݒ�
        sb = sb & """accelerate"": " & eff.Timing.Accelerate & ","
        sb = sb & """decelerate"": " & eff.Timing.Decelerate & ","
        
        ' �A�j���[�V�����̍Đ���
        sb = sb & """repeatCount"": " & eff.Timing.RepeatCount & ","
        
        ' �A�j���[�V�����̎����t�Đ�
        sb = sb & """autoReverse"": " & LCase(CStr(eff.Timing.AutoReverse))
        
        sb = sb & "}"
        If i < seq.Count Then
            sb = sb & ","
        End If
    Next i
    
    GetAnimationJson = sb
End Function

'====================================================================
' ����(�A�j���[�V����)�̃^�C�v�𕶎���ŕԂ��֐�

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
' �A�j���[�V�����̕����𕶎���ŕԂ��֐�
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
' �g���K�[�̃^�C�v�𕶎���ŕԂ��֐�

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
' Shape��Type�v���p�e�B���疼�̂�Ԃ��֐�

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
' RGB�� #RRGGBB �`���ɕϊ�����֐�

Private Function ColorToRGBHex(lColor As Long) As String
    Dim r As Long, g As Long, b As Long
    r = lColor Mod 256
    g = (lColor \ 256) Mod 256
    b = (lColor \ 65536) Mod 256
    ColorToRGBHex = "#" & Right("0" & Hex(r), 2) & Right("0" & Hex(g), 2) & Right("0" & Hex(b), 2)
End Function

'====================================================================
' JSON�Ŏg�p�ł��Ȃ���������s�����G�X�P�[�v����֐�

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
' JSON�v�f��A�����Ă���Œ��ɁA�s�v�Ȗ����J���}������Ύ�菜���֐�

Private Function RemoveTrailingComma(json As String) As String
    If Right(json, 1) = "," Then
        RemoveTrailingComma = Left(json, Len(json) - 1)
    Else
        RemoveTrailingComma = json
    End If
End Function

'====================================================================
' �e�L�X�g�t�@�C���� UTF-8 (BOM�t��) �ŏ������ފ֐�

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
' �g�����W�V�����^�C�v�𕶎���ŕԂ��֐�
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
' �g�����W�V�����X�s�[�h�𕶎���ŕԂ��֐�
Private Function GetTransitionSpeedName(speed As Long) As String
    Select Case speed
        Case ppTransitionSpeedSlow: GetTransitionSpeedName = "Slow"
        Case ppTransitionSpeedMedium: GetTransitionSpeedName = "Medium"
        Case ppTransitionSpeedFast: GetTransitionSpeedName = "Fast"
        Case Else: GetTransitionSpeedName = "Speed" & speed
    End Select
End Function


