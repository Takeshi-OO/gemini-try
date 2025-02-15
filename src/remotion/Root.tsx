// src/remotion/Root.tsx

import React from "react";
import { Sequence } from "remotion";
import { Slide as SlideType } from "../types/slide";
import { AnimatedSlideViewer } from "../components/slide/AnimatedSlideViewer";
import { calculateFramesForSlide, getTransitionDuration } from "../components/slide/utils/timeUtils";

// このRootコンポーネントがRemotionの"エントリーポイント"として使われます
export const Root: React.FC<{
  slides: SlideType[];
  templateId?: string;
  projectDir?: string;
  commitId?: string;
  resourcesDir?: string;
}> = ({ slides, templateId, projectDir, commitId, resourcesDir }) => {
  let currentFrame = 0;

  return (
    <>
      {slides.map((slide, i) => {
        const frames = calculateFramesForSlide(slide, i === slides.length - 1);
        const transitionDuration = slide.transition ? getTransitionDuration(slide.transition.speed) * 30 : 0;
        
        // 次のスライドが存在し、現在のスライドにトランジションがある場合
        const nextSlide = i < slides.length - 1 ? slides[i + 1] : null;

        const sequence = (
          <React.Fragment key={slide.slideIndex}>
            <Sequence from={currentFrame} durationInFrames={frames}>
              <AnimatedSlideViewer 
                slide={slide}
                templateId={templateId}
                projectDir={projectDir}
                commitId={commitId}
                resourcesDir={resourcesDir}
                isExiting={false}
              />
            </Sequence>
            {nextSlide && slide.transition && (
              <Sequence from={currentFrame + frames - transitionDuration} durationInFrames={transitionDuration}>
                <AnimatedSlideViewer 
                  slide={nextSlide}
                  templateId={templateId}
                  projectDir={projectDir}
                  commitId={commitId}
                  resourcesDir={resourcesDir}
                  isExiting={true}
                />
              </Sequence>
            )}
          </React.Fragment>
        );
        
        currentFrame += frames - (nextSlide && slide.transition ? transitionDuration : 0);
        return sequence;
      })}
    </>
  );
};

// デフォルトエクスポートがなくてもOK。
// ただしRemotion CLI等で使う場合は default export することもあります。
export default Root;
