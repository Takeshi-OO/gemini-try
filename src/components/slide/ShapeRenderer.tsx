import React from "react";
import { Shape } from "../../types/shape";
import { convertAlignmentToCSS, processImagePath } from "./utils/slideUtils";

// TextAlignの型を定義
type TextAlign = "left" | "center" | "right" | "justify";

interface ShapeProps {
  shape: Shape & {
    textAlign?: TextAlign;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  projectDir?: string;
  commitId?: string;
  resourcesDir?: string;
  templateId?: string;
  opacity?: number;
}

// グループシェイプレンダラー
function ShapeGroup({ shape, projectDir, commitId, resourcesDir, templateId, opacity = 1 }: ShapeProps) {
  const groupStyle: React.CSSProperties = {
    position: "absolute",
    left: typeof shape.left === 'number' ? shape.left : 0,
    top: typeof shape.top === 'number' ? shape.top : 0,
    width: typeof shape.width === 'number' ? shape.width : 0,
    height: typeof shape.height === 'number' ? shape.height : 0,
    transform: `rotate(${shape.rotation || 0}deg)`,
    transformOrigin: "center center",
    zIndex: shape.zOrder || 0,
    opacity: opacity * (1 - (shape.fillTransparency || 0)),
  };

  if (shape.fillColor) {
    groupStyle.backgroundColor = shape.fillColor;
  }
  if (shape.lineColor) {
    groupStyle.border = `1px solid ${shape.lineColor}`;
  }

  return (
    <div style={groupStyle}>
      {shape.groupItems?.map((child) => (
        <ShapeRenderer
          key={child.id}
          shape={{
            ...child,
            left: child.left - shape.left,
            top: child.top - shape.top,
          }}
          projectDir={projectDir}
          commitId={commitId}
          resourcesDir={resourcesDir}
          templateId={templateId}
          opacity={opacity}
        />
      ))}
    </div>
  );
}

// 個別シェイプレンダラー
function ShapeItem({ shape, projectDir, commitId, resourcesDir, templateId, opacity = 1 }: ShapeProps) {
  const itemStyle: React.CSSProperties = {
    position: "absolute",
    left: typeof shape.left === 'number' ? shape.left : 0,
    top: typeof shape.top === 'number' ? shape.top : 0,
    width: typeof shape.width === 'number' ? shape.width : 0,
    height: typeof shape.height === 'number' ? shape.height : 0,
    transform: `rotate(${shape.rotation || 0}deg)`,
    transformOrigin: "center center",
    zIndex: shape.zOrder || 0,
    opacity: opacity * (1 - (shape.fillTransparency || 0)),
  };

  let content: React.ReactNode = null;

  if (shape.exportedImagePath) {
    const imagePath = processImagePath(shape.exportedImagePath, {
      projectDir,
      commitId,
      resourcesDir,
      templateId
    });
    if (imagePath) {
      itemStyle.backgroundColor = "transparent";
      content = (
        <img
          src={imagePath}
          alt={shape.name || "Slide image"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      );
    }
  } else if (shape.type === "TextBox") {
    const textStyle: React.CSSProperties = {
      fontFamily: shape.font?.name,
      fontSize: shape.font?.size,
      color: shape.font?.color,
      textAlign: convertAlignmentToCSS(shape.textFrameProperties?.alignment),
      lineHeight: shape.textFrameProperties ? `${shape.textFrameProperties.lineSpacing}` : undefined,
      paddingTop: shape.textFrameProperties?.marginTop,
      paddingBottom: shape.textFrameProperties?.marginBottom,
      paddingLeft: shape.textFrameProperties?.marginLeft,
      paddingRight: shape.textFrameProperties?.marginRight,
      textIndent: shape.textFrameProperties
        ? `${(shape.textFrameProperties.indentLevel - 1) * 20}px`
        : undefined,
      whiteSpace: "pre-line",
    };
    content = <div style={textStyle}>{shape.text}</div>;
  }

  if (!shape.exportedImagePath) {
    if (shape.fillColor) {
      itemStyle.backgroundColor = shape.fillColor;
    }
    if (shape.lineColor) {
      itemStyle.border = `1px solid ${shape.lineColor}`;
    }
  }

  return <div style={itemStyle}>{content}</div>;
}

// メインのシェイプレンダラー
export function ShapeRenderer({
  shape,
  projectDir,
  commitId,
  resourcesDir,
  templateId,
  opacity = 1,
}: ShapeProps) {
  const shapeStyle: React.CSSProperties = {
    position: "absolute",
    left: shape.left,
    top: shape.top,
    width: shape.width,
    height: shape.height,
    transform: `rotate(${shape.rotation}deg)`,
    opacity,
  };

  // 画像パスを構築する関数
  const getImagePath = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (resourcesDir) {
      return `${resourcesDir}/${imagePath}`;
    }
    
    if (templateId) {
      return `/templates/${templateId}/resources/${imagePath}`;
    }
    
    return imagePath;
  };

  if (shape.type === "Text") {
    return (
      <div
        style={{
          ...shapeStyle,
          color: shape.color || "#000000",
          fontSize: shape.fontSize || 16,
          fontFamily: shape.fontFamily || "Arial",
          textAlign: (shape.textAlign || "left") as TextAlign,
          display: "flex",
          alignItems: "center",
          justifyContent: shape.textAlign === "center" ? "center" : "flex-start",
        }}
      >
        {shape.text}
      </div>
    );
  }

  if (shape.type === "Image" || shape.type === "Placeholder") {
    return (
      <div style={{
        ...shapeStyle,
        zIndex: shape.zOrder,
        opacity: opacity * (1 - (shape.fillTransparency || 0)),
        backgroundColor: "transparent"
      }}>
        <img
          src={getImagePath(shape.exportedImagePath || "")}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }}
        />
      </div>
    );
  }

  if (shape.type === "Group" && shape.groupItems) {
    return (
      <ShapeGroup
        shape={shape}
        projectDir={projectDir}
        commitId={commitId}
        resourcesDir={resourcesDir}
        templateId={templateId}
        opacity={opacity}
      />
    );
  }

  return <ShapeItem
    shape={shape}
    projectDir={projectDir}
    commitId={commitId}
    resourcesDir={resourcesDir}
    templateId={templateId}
    opacity={opacity}
  />;
} 