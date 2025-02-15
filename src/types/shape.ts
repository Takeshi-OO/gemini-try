export interface TextFrameProperties {
  alignment: string;
  indentLevel: number;
  lineSpacing: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface Font {
  name: string;
  size: number;
  color: string;
}

export interface Shape {
  name: string;
  id: number;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  zOrder: number;
  text?: string;
  font?: Font;
  fillColor?: string;
  lineColor?: string;
  exportedImagePath?: string;
  groupItems?: Shape[];
  textFrameProperties?: TextFrameProperties;
  fillTransparency?: number;
} 