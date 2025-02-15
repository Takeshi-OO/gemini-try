import { Slide } from "../../../types/slide";

// フレーム数の計算に関する定数
export const FPS = 30;
export const MIN_SLIDE_DURATION_FRAMES = FPS; // 最低1秒
export const DEFAULT_SLIDE_DURATION_FRAMES = FPS * 2; // デフォルト2秒
export const DEFAULT_TRANSITION_DURATION = 1; // デフォルトのトランジション時間（秒）

// トランジション速度を秒に変換
export function getTransitionDuration(speed: string): number {
  switch (speed) {
    case "Slow": return 2;
    case "Medium": return 1;
    case "Fast": return 0.5;
    default: return DEFAULT_TRANSITION_DURATION;
  }
}

// 1つのスライドのフレーム数を計算
export function calculateFramesForSlide(slide: Slide, isLastSlide: boolean = false): number {

  let duration = DEFAULT_SLIDE_DURATION_FRAMES / FPS;

  // パワーポイントから指定された表示時間がある場合はそれを使用
  if (slide.displayDuration) {
    duration = slide.displayDuration;
  }

  // アニメーションがある場合はその時間を考慮
  if (slide.animations && slide.animations.length > 0) {
    const lastEndTime = Math.max(
      ...slide.animations.map(anim => anim.delay + anim.duration)
    );
    duration = Math.max(duration, lastEndTime + 1); // アニメーション後に1秒待機
  }

  // トランジション時間を追加（最後のスライド以外）
  if (!isLastSlide && slide.transition) {
    duration += getTransitionDuration(slide.transition.speed);
  }

  const frames = Math.round(Math.max(MIN_SLIDE_DURATION_FRAMES, duration * FPS));
  return frames;
}

// スライド配列の合計フレーム数を計算
export function calculateTotalFrames(slides: Slide[]): number {
  let total = 0;
  
  slides.forEach((slide, index) => {
    const frames = calculateFramesForSlide(slide, index === slides.length - 1);
    const nextSlide = index < slides.length - 1 ? slides[index + 1] : null;
    const transitionDuration = slide.transition ? getTransitionDuration(slide.transition.speed) * 30 : 0;
    
    total += frames - (nextSlide && slide.transition ? transitionDuration : 0);
  });
  
  return total;
}

// フレーム数を秒数に変換
export function framesToSeconds(frames: number): number {
  return frames / FPS;
}

// 秒数をフレーム数に変換
export function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
} 