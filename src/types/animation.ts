export interface Animation {
  shapeId: number;
  effectType: string;
  isExit: boolean;
  triggerType: string;
  duration: number;
  delay: number;
  direction?: string;
  motionEffect?: {
    fromX?: number;
    fromY?: number;
    toX?: number;
    toY?: number;
    path?: string;
  };
  accelerate: number;
  decelerate: number;
  repeatCount: number;
  autoReverse: boolean;
} 