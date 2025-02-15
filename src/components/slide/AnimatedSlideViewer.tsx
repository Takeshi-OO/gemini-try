import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Slide } from "../../types/slide";
import { Animation } from "../../types/animation";
import { ShapeRenderer } from "./ShapeRenderer";
import { getTransitionDuration } from "./utils/timeUtils";
import { fixRotatedImages } from "./utils/slideUtils";

// アニメーション効果の計算
function useAnimationEffect(animation: Animation, frame: number) {
  const startFrame = animation.delay * 30;
  const durationFrames = animation.duration * 30;
  const endFrame = startFrame + durationFrames;


  let opacity = 1;
  if (animation.effectType === "Fade") {
    if (animation.isExit) {
      opacity = interpolate(
        frame,
        [startFrame, endFrame],
        [1, 0],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
    } else {
      opacity = interpolate(
        frame,
        [startFrame, endFrame],
        [0, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
    }
  }

  let transform = "";
  if (animation.motionEffect) {
    const { fromX, fromY, toX, toY } = animation.motionEffect;
    if (typeof fromX === "number" && typeof fromY === "number" && 
        typeof toX === "number" && typeof toY === "number") {
      const x = interpolate(
        frame,
        [startFrame, endFrame],
        [fromX, toX],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
      const y = interpolate(
        frame,
        [startFrame, endFrame],
        [fromY, toY],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
      transform = `translate(${x}px, ${y}px)`;
    }
  }

  // アニメーション終了後も表示を維持
  const isActive = !animation.isExit || frame <= endFrame;

  return { opacity, transform, isActive };
}

// トランジション効果の計算
function useTransitionEffect(slide: Slide, frame: number) {
  const transitionDuration = slide.transition ? getTransitionDuration(slide.transition.speed) * 30 : 0;
  
  let opacity = 1;
  if (slide.transition && slide.transition.type === "Fade") {
    opacity = interpolate(
      frame,
      [0, transitionDuration],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );
  }

  return { opacity };
}

interface AnimatedSlideViewerProps {
  slide: Slide;
  templateId?: string;
  projectDir?: string;
  commitId?: string;
  resourcesDir?: string;
  isExiting?: boolean;
}

export function AnimatedSlideViewer({
  slide,
  templateId,
  projectDir,
  commitId,
  resourcesDir,
  isExiting = false,
}: AnimatedSlideViewerProps) {
  const frame = useCurrentFrame();

  
  let opacity = 1;
  
  if (slide.transition) {
    const transitionDuration = getTransitionDuration(slide.transition.speed) * 30;
    
    if (slide.transition.type === "Split" || slide.transition.type === "Fade") {
      if (isExiting) {
        opacity = interpolate(
          frame,
          [0, transitionDuration],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );
      } else {
        opacity = interpolate(
          frame,
          [0, transitionDuration],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );
      }
    }
  }

  // スライドの表示時間を超えた場合は何も表示しない
  if (slide.displayDuration && frame >= slide.displayDuration * 30) {

    return null;
  }

  // シェイプを z-order でソート
  const sortedShapes = [...(slide.shapes ?? [])].sort((a, b) => a.zOrder - b.zOrder);

  // 回転した画像を修正
  if (slide.shapes) {
    fixRotatedImages(slide.shapes);
  }

  const scale = Math.min(1280 / slide.width, 720 / slide.height);
  const scaledWidth = slide.width * scale;
  const scaledHeight = slide.height * scale;
  
  const marginLeft = (1280 - scaledWidth) / 2;
  const marginTop = (720 - scaledHeight) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <div style={{
        position: "absolute",
        left: marginLeft,
        top: marginTop,
        width: slide.width,
        height: slide.height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        opacity,
      }}>
        {sortedShapes.map((shape) => {
          const animation = slide.animations?.find(a => a.shapeId === shape.id);
          let opacity = 1;
          let transform = "";
          let shouldRender = true;

          if (animation) {
            const effect = useAnimationEffect(animation, frame);
            opacity = effect.opacity;
            transform = effect.transform;
            shouldRender = effect.isActive;
          }

          if (!shouldRender) {
            return null;
          }

          return (
            <div
              key={shape.id}
              style={{
                position: "absolute",
                transform,
                width: 0,
                height: 0,
              }}
            >
              <ShapeRenderer
                shape={shape}
                opacity={opacity}
                templateId={templateId}
                projectDir={projectDir}
                commitId={commitId}
                resourcesDir={resourcesDir}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
} 