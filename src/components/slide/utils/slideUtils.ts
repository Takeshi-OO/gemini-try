import { Shape } from '../../../types/shape';

export function convertAlignmentToCSS(align: string | undefined): React.CSSProperties["textAlign"] {
  if (!align) return "left";
  switch (align.toLowerCase()) {
    case "left":
      return "left";
    case "center":
      return "center";
    case "right":
      return "right";
    case "justify":
      return "justify";
    default:
      return "left";
  }
}

interface ImagePathOptions {
  projectDir?: string;
  commitId?: string;
  resourcesDir?: string;
  templateId?: string;
}

export function processImagePath(imagePath: string, options: ImagePathOptions): string {
  const { projectDir, commitId, resourcesDir, templateId } = options;

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
}

export function removeImageRotation(shape: Shape) {
  if (shape.groupItems && shape.groupItems.length > 0) {
    shape.groupItems.forEach((child: Shape) => removeImageRotation(child));
  }

  if (
    shape.exportedImagePath &&
    (shape.rotation === 90 || shape.rotation === 270)
  ) {
    const oldLeft = shape.left;
    const oldTop = shape.top;
    const oldWidth = shape.width;
    const oldHeight = shape.height;

    const cx = oldLeft + oldWidth / 2;
    const cy = oldTop + oldHeight / 2;

    shape.width = oldHeight;
    shape.height = oldWidth;
    shape.left = cx - shape.width / 2;
    shape.top = cy - shape.height / 2;
    shape.rotation = 0;
  }
}

export function fixRotatedImages(shapes: Shape[]) {
  shapes.forEach(shape => removeImageRotation(shape));
} 